package service

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"os"
	producer "public-service/kafka/producer"
	"public-service/model"
	"public-service/repository"
)

type IndexerService struct {
	kafkaProducer      *producer.PublicServiceProducer
	workflowIntegrator *WorkflowIntegrator
	mdmsV2Service      *MDMSV2Service
}

func NewIndexerService(repo repository.RestCallRepository, kafkaProducer *producer.PublicServiceProducer,
	workflowIntegrator *WorkflowIntegrator, mdmsV2Service *MDMSV2Service) *IndexerService {
	return &IndexerService{
		kafkaProducer:      kafkaProducer,
		workflowIntegrator: workflowIntegrator,
		mdmsV2Service:      mdmsV2Service,
	}
}

func (i *IndexerService) SendRequestToIndexerForParallelWorkflow(req model.ApplicationResponse, reqInfo model.RequestInfo, topic string) error {
	app := req.Application
	schemaCode := os.Getenv("SERVICE_MODULE_NAME") + "." + os.Getenv("SERVICE_MASTER_NAME")
	filters := map[string]string{
        "service": app.BusinessService,
        "module":  app.Module,}

	mdmsData, err := i.mdmsV2Service.SearchMDMS(app.TenantId, schemaCode, filters, reqInfo)
	if err != nil {
		log.Println("error calling search mdms", err)
		return errors.New("error calling search mdms " + err.Error())
	}

	mdmsList, ok := mdmsData["mdms"].([]interface{})
	if !ok || len(mdmsList) == 0 {
		log.Println("MDMS data missing or invalid")
		return nil
	}

	log.Println("mdmsData:", mdmsData)
	firstEntry, _ := mdmsList[0].(map[string]interface{})
	data, _ := firstEntry["data"].(map[string]interface{})
	workflowData, ok := data["workflow"].(map[string]interface{})
	if !ok {
		log.Println("No 'workflow' section in MDMS data")
		return nil
	}

	// Extract and build map: state -> triggerParallelWorkflows
	stateToParallelWorkflows := make(map[string][]string)

	states, ok := workflowData["states"].([]interface{})
	if !ok {
		log.Println("No 'states' array in workflow")
		return nil
	}

	for _, s := range states {
		stateMap, ok := s.(map[string]interface{})
		if !ok {
			continue
		}

		stateName, _ := stateMap["state"].(string)
		if stateName == "" {
			continue
		}

		if parallel, exists := stateMap["triggerParallelWorkflows"]; exists {
			parallelList, ok := parallel.([]interface{})
			if !ok || len(parallelList) == 0 {
				continue
			}

			var workflows []string
			for _, item := range parallelList {
				if wf, ok := item.(string); ok {
					workflows = append(workflows, wf)
				}
			}

			if len(workflows) > 0 {
				stateToParallelWorkflows[stateName] = workflows
			}
		}
	}
	if app.ProcessInstance != nil && len(*app.ProcessInstance) > 0 {
		currentState := (*app.ProcessInstance)[0].State.State
		if workflows, found := stateToParallelWorkflows[currentState]; found {
			log.Printf("Trigger parallel workflows for state '%s': %v\n", currentState, workflows)
			for _, workflow := range workflows {
				req.Application.Workflow.BusinessService = workflow
				i.workflowIntegrator.SearchWorkflow(&req.Application, reqInfo)
				kafkaPayload, err := json.Marshal(req)
				if err != nil {
					log.Printf("Failed to marshal application request for workflow %s: %v\n", workflow, err)
					continue
				}

				if i.kafkaProducer != nil {
					log.Printf("Sending Kafka message for workflow %s: %s\n", workflow, string(kafkaPayload))
					err = i.kafkaProducer.Push(context.Background(),topic, kafkaPayload)
					if err != nil {
						log.Printf("Failed to push Kafka message for workflow %s: %v\n", workflow, err)
					}
				} else {
					log.Println("Kafka producer is not initialized")
				}
			}
		} else {
			log.Printf("No parallel workflows configured for current state: %s\n", currentState)
		}
	} else {
		log.Println("No process instances found in application")
	}

	return nil
}
