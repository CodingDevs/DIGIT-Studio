package consumer

import (
	"context"
	"encoding/json"
	"log"
	"os"
	"time"

	"public-service/config"
	"public-service/model"
	"public-service/model/payment"
	"public-service/service"
	"github.com/segmentio/kafka-go"
)

func ConsumePayments(workflowIntegrator *service.WorkflowIntegrator, applicationService *service.ApplicationService) {
	topic := os.Getenv("KAFKA_TOPICS_PAYMENT_CREATE_NAME")
	if topic == "" {
		log.Fatal("❌ KAFKA_TOPICS_PAYMENT_CREATE_NAME is not set")
	}

	r := kafka.NewReader(kafka.ReaderConfig{
		Brokers:  []string{config.GetEnv("KAFKA_BOOTSTRAP_SERVERS")},
		GroupID:  "public-service-group",
		Topic:    topic,
		MaxBytes: 10e6,
	})
	defer r.Close()

	log.Printf("📡 Kafka consumer started on topic: %s", topic)

	for {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		m, err := r.FetchMessage(ctx)
		if err != nil {
			log.Printf("❌ Error reading message: %v", err)
			continue
		}

		var paymentReq payment.PaymentRequest
		if err := json.Unmarshal(m.Value, &paymentReq); err != nil {
			log.Printf("❌ Failed to unmarshal payment request: %v", err)
			continue
		}

		if len(paymentReq.Payment.PaymentDetails) == 0 {
			log.Printf("⚠️ No payment details found in message: %+v", paymentReq)
			continue
		}

		detail := paymentReq.Payment.PaymentDetails[0]
		if detail.Bill.ConsumerCode == "" || detail.BusinessService == "" {
			log.Printf("❌ Invalid payment detail: missing consumerCode or businessService")
			continue
		}

		criteria := model.SearchCriteria{
			TenantId:          paymentReq.Payment.TenantID,
			ApplicationNumber: detail.Bill.ConsumerCode,
		}

		searchRes, err := applicationService.SearchApplication(context.Background(), criteria, paymentReq.RequestInfo.AuthToken)
		if err != nil || len(searchRes.Application) == 0 {
			log.Printf("❌ Application not found for payment: %+v, error: %v", criteria, err)
			continue
		}

		application := searchRes.Application[0]
		schemaCode := os.Getenv("SERVICE_MODULE_NAME") + "." + os.Getenv("SERVICE_MASTER_NAME")
		mdmsData, _ := workflowIntegrator.MDMSV2Service.SearchMDMS(
			application.TenantId,
			schemaCode,
			application.BusinessService,
			application.Module,
			paymentReq.RequestInfo,
		)

		var nextActionAfterPayment string

		mdmsList, ok := mdmsData["mdms"].([]interface{})
		if !ok || len(mdmsList) == 0 {
			log.Println("❌ MDMS data missing or invalid")
		} else {
			firstEntry, ok := mdmsList[0].(map[string]interface{})
			if !ok {
				log.Println("❌ Failed to parse first MDMS entry")
			} else if data, ok := firstEntry["data"].(map[string]interface{}); ok {
				if workflow, ok := data["workflow"].(map[string]interface{}); ok {
					if action, ok := workflow["nextActionAfterPayment"].(string); ok {
						nextActionAfterPayment = action
						log.Printf("✅ Extracted nextActionAfterPayment: %s", nextActionAfterPayment)
					} else {
						log.Println("⚠️ nextActionAfterPayment not found or invalid")
					}
				} else {
					log.Println("⚠️ workflow object not found in data")
				}
			} else {
				log.Println("⚠️ data field not found or invalid in MDMS")
			}
		}

		// Do the following only if nextActionAfterPayment is available
		if nextActionAfterPayment != "" {
			application.Workflow.Action = nextActionAfterPayment

			appReq := model.ApplicationRequest{
				RequestInfo: paymentReq.RequestInfo,
				Application: application,
			}

			log.Printf("📩 Payment received for application [%s] on topic [%s]", application.ApplicationNumber, m.Topic)

			if err := workflowIntegrator.CallWorkflow(&appReq); err != nil {
				log.Printf("❌ Failed to update workflow after payment: %v", err)
				continue
			}

			if _, err := applicationService.UpdateApplication(context.Background(), appReq, application.ServiceCode); err != nil {
				log.Printf("❌ Failed to update application after payment: %v", err)
				continue
			}

			log.Printf("✅ Application [%s] updated successfully after payment", application.ApplicationNumber)
		} else {
			log.Printf("⚠️ Skipping workflow and application update since nextActionAfterPayment is empty for application [%s]", application.ApplicationNumber)
		}

		if err := r.CommitMessages(ctx, m); err != nil {
			log.Printf("⚠️ Failed to commit Kafka message: %v", err)
			continue
		}
	}
}
