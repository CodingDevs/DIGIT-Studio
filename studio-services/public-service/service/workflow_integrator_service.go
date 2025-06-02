package service

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	_ "github.com/joho/godotenv"
	"log"
	"net/http"
	"os"
	"public-service/config"
	"public-service/model"
)

const (
	TENANT_ID_KEY        = "tenantId"
	BUSINESS_SERVICE_KEY = "businessService"
	ACTION_KEY           = "action"
	COMMENT_KEY          = "comment"
	MODULE_NAME_KEY      = "moduleName"
	BUSINESS_ID_KEY      = "businessId"
	DOCUMENTS_KEY        = "documents"
	ASSIGNEE_KEY         = "assignes"
	UUID_KEY             = "uuid"
	WORKFLOW_REQUEST_KEY = "ProcessInstances"
	REQUEST_INFO_KEY     = "RequestInfo"
)

// WorkflowIntegrator handles interaction with the workflow service.
type WorkflowIntegrator struct {
	HttpClient    *http.Client
	MDMSV2Service *MDMSV2Service
}

// NewWorkflowIntegrator returns a new instance of WorkflowIntegrator.
func NewWorkflowIntegrator(MdmsV2sService *MDMSV2Service) *WorkflowIntegrator {
	return &WorkflowIntegrator{
		HttpClient:    &http.Client{},
		MDMSV2Service: MdmsV2sService,
	}
}

// CallWorkflow integrates with the workflow and updates the application with the workflow response.
func (wi *WorkflowIntegrator) CallWorkflow(req *model.ApplicationRequest) error {
	app := req.Application
	log.Println("inside CallWorkflow")
	log.Println("🔥🔥🔥 Inside CallWorkflow - LOG TRIGGERED 🔥🔥🔥")
	requestPayload := make(map[string]interface{})
	processInstance := make(map[string]interface{})
	schemaCode := os.Getenv("SERVICE_MODULE_NAME") + "." + os.Getenv("SERVICE_MASTER_NAME")
	mdmsData, err 	:= wi.MDMSV2Service.SearchMDMS(app.TenantId, schemaCode, app.BusinessService, app.Module, req.RequestInfo)
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
		log.Println("No 'Workflow' section in MDMS data")
	}
	var businessService string

	if app.Workflow.BusinessService != "" {
		businessService = app.Workflow.BusinessService
	} else if bs, ok := workflowData["businessService"].(string); ok && bs != "" {
		businessService = bs
	} else {
		log.Println("BusinessService not found in workflow data or application")
		return errors.New("unable to resolve businessService from application or MDMS")
	}


	processInstance[BUSINESS_ID_KEY] = app.ApplicationNumber
	processInstance[TENANT_ID_KEY] = app.TenantId
	processInstance[BUSINESS_SERVICE_KEY] = businessService
	processInstance[MODULE_NAME_KEY] = app.Module
	processInstance[ACTION_KEY] = app.Workflow.Action
	processInstance[COMMENT_KEY] = app.Workflow.Comment

	if len(app.Workflow.Assignees) > 0 {
		var uuidMaps []map[string]string
		for _, assignee := range app.Workflow.Assignees {
			uuidMaps = append(uuidMaps, map[string]string{UUID_KEY: assignee.Uuid.String()})
		}
		processInstance[ASSIGNEE_KEY] = uuidMaps
	}

	processInstance[DOCUMENTS_KEY] = app.Workflow.Documents

	requestPayload[REQUEST_INFO_KEY] = req.RequestInfo
	requestPayload[WORKFLOW_REQUEST_KEY] = []map[string]interface{}{processInstance}
	log.Println("inside CallWorkflow", requestPayload)
	payloadBytes, err := json.Marshal(requestPayload)
	if err != nil {
		return fmt.Errorf("error marshaling workflow request: %w", err)
	}

	wfHost := os.Getenv("WORKFLOW_HOST")
	wfPath := os.Getenv("WORKFLOW_TRANSITION_PATH")
	if wfHost == "" || wfPath == "" {
		log.Println("wfHost", wfHost)
		log.Println("wfPath", wfPath)
		return errors.New("workflow host or path is not set in environment variables")
	}

	url := wfHost + wfPath
	resp, err := wi.HttpClient.Post(url, "application/json", bytes.NewReader(payloadBytes))
	if err != nil {
		return fmt.Errorf("failed to call workflow: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		var errResp map[string]interface{}
		_ = json.NewDecoder(resp.Body).Decode(&errResp)
		return fmt.Errorf("workflow service returned status %d: %v", resp.StatusCode, errResp)
	}

	var wfResponse model.ProcessInstanceResponse
	if err := json.NewDecoder(resp.Body).Decode(&wfResponse); err != nil {
		return fmt.Errorf("error decoding workflow response: %w", err)
	}

	if len(wfResponse.ProcessInstances) == 0 {
		return errors.New("no process instance returned from workflow")
	}
	req.Application.ProcessInstance = &wfResponse.ProcessInstances
	return nil
}

func (wi *WorkflowIntegrator) SearchWorkflow(applicationResponse *model.Application, req model.RequestInfo, ) error {
	app := applicationResponse
	log.Println("Search CallWorkflow")
	log.Println("🔥🔥🔥 Inside SearchWorkflow - LOG TRIGGERED 🔥🔥🔥")
	requestPayload := make(map[string]interface{})
	requestPayload[REQUEST_INFO_KEY] = req

	payloadBytes, err := json.Marshal(requestPayload)
	if err != nil {
		return fmt.Errorf("error marshaling workflow request: %w", err)
	}

	config.LoadEnv()
	wfHost := config.GetEnv("WORKFLOW_HOST")
	wfPath := config.GetEnv("WORKFLOW_SEARCH_PATH")
	if wfHost == "" || wfPath == "" {
		log.Println("wfHost", wfHost)
		log.Println("wfPath", wfPath)
		return errors.New("workflow host or search path is not set in environment variables")
	}

	url := fmt.Sprintf("%s%s?tenantId=%s&businessIds=%s&businessService=%s", wfHost, wfPath, app.TenantId, app.ApplicationNumber,app.Workflow.BusinessService)
	log.Println("URL:", url)

	resp, err := wi.HttpClient.Post(url, "application/json", bytes.NewReader(payloadBytes))
	if err != nil {
		return fmt.Errorf("failed to call workflow: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		var errResp map[string]interface{}
		_ = json.NewDecoder(resp.Body).Decode(&errResp)
		return fmt.Errorf("workflow service returned status %d: %v", resp.StatusCode, errResp)
	}

	var wfResponse model.ProcessInstanceResponse
	if err := json.NewDecoder(resp.Body).Decode(&wfResponse); err != nil {
		return fmt.Errorf("error decoding workflow response: %w", err)
	}

	if len(wfResponse.ProcessInstances) == 0 {
		return errors.New("no process instance returned from workflow")
	}
	// Assign only the 0th element as a slice to the pointer
	firstInstance := []model.ProcessInstance{wfResponse.ProcessInstances[0]}
	applicationResponse.ProcessInstance = &firstInstance
	return nil
}
