package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"public-service/config"
	producer "public-service/kafka/producer"
	"public-service/model"
	_ "public-service/model/demand"
	"public-service/model/sms"
	"public-service/repository"
	"strconv"
	"strings"
	"os"
	"errors"
)

type SMSService struct {
	restCallRepo        repository.RestCallRepository
	localizationService *LocalizationService
	kafkaProducer       *producer.PublicServiceProducer
	demandService       *DemandService
	workflowIntegrator  *WorkflowIntegrator
	mdmsV2Service       *MDMSV2Service
}

func NewSMSService(repo repository.RestCallRepository, localizationService *LocalizationService, kafkaProducer *producer.PublicServiceProducer, demandService *DemandService,
	workflowIntegrator *WorkflowIntegrator,mdmsV2Service *MDMSV2Service) *SMSService {
	return &SMSService{
		restCallRepo:        repo,
		localizationService: localizationService,
		kafkaProducer:       kafkaProducer,
		demandService:       demandService,
		workflowIntegrator: workflowIntegrator,
		mdmsV2Service: mdmsV2Service,

	}
}

func (s *SMSService) SendSMSOld(application model.ApplicationRequest, tenantId string, templateCode string, owners []model.Applicant) (map[string]interface{}, error) {
	localizationMessage := s.localizationService.GetLocalizationMessage(
		application.RequestInfo,
		templateCode,
		tenantId,
	)

	templateMsg := localizationMessage["message"]
	if templateMsg == "" {
		log.Println("Localization message not found for template:", templateCode)
		return nil, fmt.Errorf("template message not found")
	}

	if s.kafkaProducer == nil {
		return nil, fmt.Errorf("Kafka producer is not initialized")
	}

	// Fetch bills and calculate total amount
	bills, err := s.demandService.fetchBill(application)
	if err != nil {
		log.Printf("Error fetching bill for application %s: %v", application.Application.ApplicationNumber, err)
		return nil, err
	}
	if jsonBytes, err := json.MarshalIndent(bills, "", "  "); err == nil {
		log.Printf("FetchBill Request JSON:\n%s", string(jsonBytes))
	} else {
		log.Printf("Failed to marshal billRequest: %v", err)
	}
	var totalAmount float64
	for _, bill := range bills {
		totalAmount += bill.TotalAmount
	}
	amountStr := strconv.FormatFloat(totalAmount, 'f', 2, 64)
    log.Println("amtStr::::",amountStr)
	// Loop over all owners to send SMS
	for _, owner := range owners {
		msg := templateMsg

		if owner.Name != "" {
			msg = strings.ReplaceAll(msg, "{PublicService.applicants[0].name}", owner.Name)
		}
		if application.Application.ApplicationNumber != "" {
			msg = strings.ReplaceAll(msg, "{PublicService.applicationNo}", application.Application.ApplicationNumber)
		}
		msg = strings.ReplaceAll(msg, "{Bill.totalAmount}", amountStr)

		smsRequest := sms.SMSRequest{
			MobileNumber: strconv.FormatInt(owner.MobileNumber, 10),
			Message:      msg,
			Category:     sms.CategoryNotification,
			TenantID:     tenantId,
		}

		smsBytes, err := json.Marshal(smsRequest)
		if err != nil {
			log.Printf("Failed to marshal SMSRequest for owner %v: %v", owner.MobileNumber, err)
			continue
		}

		ctx := context.Background()
		err = s.kafkaProducer.Push(ctx, config.GetEnv("SEND_SMS_TOPIC"), smsBytes)
		if err != nil {
			log.Printf("Failed to push Kafka message for owner %v: %v", owner.MobileNumber, err)
			continue
		}

		//err = s.kafkaProducer.Push(ctx, config.GetEnv("SEND_NOTIFICATION_TOPIC"), smsBytes)
		//if err != nil {
		//	log.Printf("Failed to push Kafka message for owner %v: %v", owner.MobileNumber, err)
		//	continue
		//}
	}

	return map[string]interface{}{
		"status":  "success",
		"message": "Messages sent",
	}, nil
}

func (s *SMSService) SendSMS(application model.ApplicationRequest, tenantId string, owners []model.Applicant) (map[string]interface{}, error) {
	err := s.workflowIntegrator.SearchWorkflow(&application.Application, application.RequestInfo)
	if err != nil {
		return nil, fmt.Errorf("error while calling search ProcessInstance  %v",err)
	}

	schemaCode := os.Getenv("SERVICE_MODULE_NAME") + "." + os.Getenv("SERVICE_MASTER_NAME")
	mdmsData, _ := s.mdmsV2Service.SearchMDMS(
		application.Application.TenantId,
		schemaCode,
		application.Application.BusinessService,
		application.Application.Module,
		application.RequestInfo,
	)

	mdmsList, ok := mdmsData["mdms"].([]interface{})
	if !ok || len(mdmsList) == 0 {
		log.Println("MDMS data missing or invalid")
		return nil, errors.New("MDMS data missing or invalid")
	}

	firstEntry, _ := mdmsList[0].(map[string]interface{})
	data, _ := firstEntry["data"].(map[string]interface{})
	notification, ok := data["notification"].(map[string]interface{})
	if !ok {
		log.Println("No 'notification' section in MDMS data")
		return nil, errors.New("No 'notification' section in MDMS data")
	}

	smsList, ok := notification["sms"].([]interface{})
	if !ok {
		log.Println("No 'sms' section in MDMS notification data")
		return nil, errors.New("No 'sms' section in MDMS data")
	}

	// Default value if state not found
	var matchedCode string

	currentState := ""
	if application.Application.ProcessInstance != nil && len(*application.Application.ProcessInstance) > 0 {
		currentState = (*application.Application.ProcessInstance)[0].State.State
	}
	

	// Find matching code based on current state
	for _, smsItem := range smsList {
		itemMap, ok := smsItem.(map[string]interface{})
		if !ok {
			continue
		}

		states, ok := itemMap["states"].([]interface{})
		if !ok {
			continue
		}

		for _, state := range states {
			stateStr, _ := state.(string)
			if strings.EqualFold(stateStr, currentState) {
				matchedCode, _ = itemMap["code"].(string)
				break
			}
		}

		if matchedCode != "" {
			break
		}
	}

	if matchedCode == "" {
		log.Printf("No matching SMS template code found for state: %s", currentState)
		return nil, fmt.Errorf("no matching template code found")
	}

	// Fetch localized message for matchedCode
	localizationMessage := s.localizationService.GetLocalizationMessage(
		application.RequestInfo,
		matchedCode,
		tenantId,
	)

	templateMsg := localizationMessage["message"]
	if templateMsg == "" {
		log.Println("Localization message not found for template:", matchedCode)
		return nil, fmt.Errorf("template message not found")
	}
	log.Println(localizationMessage)

	// Fetch bill and total amount
	bills, err := s.demandService.fetchBill(application)
	if err != nil {
		log.Printf("Error fetching bill for application %s: %v", application.Application.ApplicationNumber, err)
		return nil, err
	}
	var totalAmount float64
	for _, bill := range bills {
		totalAmount += bill.TotalAmount
	}
	amountStr := strconv.FormatFloat(totalAmount, 'f', 2, 64)

	// Send SMS to all owners
	for _, owner := range owners {
		msg := templateMsg
		msg = strings.ReplaceAll(msg, "{PublicService.applicants[0].name}", owner.Name)
		msg = strings.ReplaceAll(msg, "{PublicService.applicationNo}", application.Application.ApplicationNumber)
		msg = strings.ReplaceAll(msg, "{Bill.totalAmount}", amountStr)

		smsRequest := sms.SMSRequest{
			MobileNumber: strconv.FormatInt(owner.MobileNumber, 10),
			Message:      msg,
			Category:     sms.CategoryNotification,
			TenantID:     tenantId,
		}

		smsBytes, err := json.Marshal(smsRequest)
		if err != nil {
			log.Printf("Failed to marshal SMSRequest for owner %v: %v", owner.MobileNumber, err)
			continue
		}

		ctx := context.Background()
		err = s.kafkaProducer.Push(ctx, config.GetEnv("SEND_SMS_TOPIC"), smsBytes)
		if err != nil {
			log.Printf("Failed to push Kafka message for owner %v: %v", owner.MobileNumber, err)
			continue
		}
	}

	return map[string]interface{}{
		"status":  "success",
		"message": "Messages sent",
	}, nil
}


func (s *SMSService) SendEmail(application model.ApplicationRequest, tenantId string, owners []model.Applicant) (map[string]interface{}, error) {
	err := s.workflowIntegrator.SearchWorkflow(&application.Application, application.RequestInfo)
	if err != nil {
		return nil, fmt.Errorf("error while calling search ProcessInstance: %v", err)
	}

	schemaCode := os.Getenv("SERVICE_MODULE_NAME") + "." + os.Getenv("SERVICE_MASTER_NAME")
	mdmsData, _ := s.mdmsV2Service.SearchMDMS(
		application.Application.TenantId,
		schemaCode,
		application.Application.BusinessService,
		application.Application.Module,
		application.RequestInfo,
	)

	mdmsList, ok := mdmsData["mdms"].([]interface{})
	if !ok || len(mdmsList) == 0 {
		log.Println("MDMS data missing or invalid")
		return nil, errors.New("MDMS data missing or invalid")
	}

	firstEntry, _ := mdmsList[0].(map[string]interface{})
	data, _ := firstEntry["data"].(map[string]interface{})
	notification, ok := data["notification"].(map[string]interface{})
	if !ok {
		log.Println("No 'notification' section in MDMS data")
		return nil, errors.New("No 'notification' section in MDMS data")
	}

	emailList, ok := notification["email"].([]interface{})
	if !ok {
		log.Println("No 'email' section in MDMS notification data")
		return nil, errors.New("No 'email' section in MDMS data")
	}

	var matchedCode string
	currentState := ""
	if application.Application.ProcessInstance != nil && len(*application.Application.ProcessInstance) > 0 {
		currentState = (*application.Application.ProcessInstance)[0].State.State
	}

	for _, emailItem := range emailList {
		itemMap, ok := emailItem.(map[string]interface{})
		if !ok {
			continue
		}

		states, ok := itemMap["states"].([]interface{})
		if !ok {
			continue
		}

		for _, state := range states {
			stateStr, _ := state.(string)
			if strings.EqualFold(stateStr, currentState) {
				matchedCode, _ = itemMap["code"].(string)
				break
			}
		}

		if matchedCode != "" {
			break
		}
	}

	if matchedCode == "" {
		log.Printf("No matching email template code found for state: %s", currentState)
		return nil, fmt.Errorf("no matching template code found")
	}
	localizationMessage := s.localizationService.GetLocalizationMessage(
		application.RequestInfo,
		matchedCode,
		tenantId,
	)

	templateMsg := localizationMessage["message"]
	if templateMsg == "" {
		log.Println("Localization message not found for template:", matchedCode)
		return nil, fmt.Errorf("template message not found")
	}
	log.Println(localizationMessage)

	// Fetch bill and calculate total amount
	bills, err := s.demandService.fetchBill(application)
	if err != nil {
		log.Printf("Error fetching bill for application %s: %v", application.Application.ApplicationNumber, err)
		return nil, err
	}
	var totalAmount float64
	for _, bill := range bills {
		totalAmount += bill.TotalAmount
	}
	amountStr := strconv.FormatFloat(totalAmount, 'f', 2, 64)

	// Send Email to all owners
	for _, owner := range owners {
		msg := templateMsg
		msg = strings.ReplaceAll(msg, "{PublicService.applicants[0].name}", owner.Name)
		msg = strings.ReplaceAll(msg, "{PublicService.applicationNo}", application.Application.ApplicationNumber)
		msg = strings.ReplaceAll(msg, "{Bill.totalAmount}", amountStr)

		emailToList := []string{}
		if owner.EmailId != "" {
			emailToList = append(emailToList, owner.EmailId)
		} else {
			log.Printf("Skipping owner with empty EmailId: %+v", owner)
			continue
		}

		email := sms.Email{
			TenantId:    tenantId,
			EmailTo:     emailToList,
			Body:        msg,
			FileStoreId: nil,
			IsHTML:      true,
		}

		emailRequest := sms.EmailRequest{
			RequestInfo: application.RequestInfo,
			Email:       email,
		}

		emailBytes, err := json.Marshal(emailRequest)
		if err != nil {
			log.Printf("Failed to marshal EmailRequest for owner %v: %v", owner.EmailId, err)
			continue
		}

		ctx := context.Background()
		err = s.kafkaProducer.Push(ctx, config.GetEnv("SEND_EMAIL_TOPIC"), emailBytes)
		if err != nil {
			log.Printf("Failed to push Kafka message for owner %v: %v", owner.EmailId, err)
			continue
		}
	}

	return map[string]interface{}{
		"status":  "success",
		"message": "Email sent",
	}, nil
}
