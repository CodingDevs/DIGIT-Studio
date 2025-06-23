package service

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"

	"public-service/model"
	"public-service/repository"
)

type WorkflowService struct {
	httpClient *http.Client
	MdmsV2Service *MDMSV2Service
	restCallRepo  repository.RestCallRepository

}

// NewWorkflowIntegrator returns a new instance of WorkflowIntegrator.
func NewWorkflowService(MdmsV2sService *MDMSV2Service, repo repository.RestCallRepository,
	) *WorkflowService {
		return &WorkflowService{
			httpClient: &http.Client{},
			MdmsV2Service: MdmsV2sService,
			restCallRepo:  repo,
		}
	}

func (ws *WorkflowService) CreateBusinessService(businessServiceRequest model.BusinessServiceRequest) (model.BusinessServiceResponse, error) {
	payload, err := json.Marshal(businessServiceRequest)
	var response model.BusinessServiceResponse
	if err != nil {
		return response,fmt.Errorf("failed to marshal workflow: %w", err)
	}

	url := os.Getenv("WF_BUSINESS_SERVICE_CREATE_URL")
	if url == "" {
		return response, errors.New("workflow business service create URL not set in environment variables")
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(payload))
	if err != nil {
		return response,fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := ws.httpClient.Do(req)
	if err != nil {
		return response,fmt.Errorf("failed to call business service create API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return response,fmt.Errorf("business service create returned unexpected status: %d", resp.StatusCode)
	}

	return response,nil
}

func (ws *WorkflowService) SearchBusinessService(request model.ServiceRequest, businessService string) (model.BusinessServiceResponse, error) {
	WorkFlowhost := os.Getenv("WORKFLOW_HOST")
	businessPath := os.Getenv("WF_BUSINESS_SERVICE_SEARCH_PATH")
	var finalResponse model.BusinessServiceResponse

	if businessPath == "" {
		return finalResponse, errors.New("workflow business service search URL not set in environment variables")
	}

	query := fmt.Sprintf(
		"%s%s?businessServices=%s&tenantId=%s",
		WorkFlowhost,
		businessPath,
		businessService,
		request.Service.TenantId,
	)

	searchReqBody := map[string]interface{}{
		"RequestInfo": request.RequestInfo,
	}

	log.Printf("Calling Workflow Search URL: %v", query)

	err := ws.restCallRepo.Post(query, searchReqBody, &finalResponse)
	if err != nil {
		return finalResponse, fmt.Errorf("workflow search failed: %w", err)
	}

	if len(finalResponse.BusinessServices) == 0 {
		log.Println("No BusinessService found.")
	}

	return finalResponse, nil
}

func (ws *WorkflowService) CreateAndValidateBusinessService(request model.ServiceRequest) (model.BusinessServiceResponse, error) {
	var finalResponse model.BusinessServiceResponse

	// ===================== MDMS Search =====================
	schemaCode := os.Getenv("SERVICE_MODULE_NAME") + "." + os.Getenv("SERVICE_MASTER_NAME")
	filters := map[string]string{
		"service": request.Service.BusinessService,
		"module": request.Service.Module,
	}
	mdmsData, err := ws.MdmsV2Service.SearchMDMS(
		request.Service.TenantId,
		schemaCode,
		filters,		
		request.RequestInfo,
	)
	if err != nil {
		return finalResponse, fmt.Errorf("MDMS service call failed: %w", err)
	}

	mdmsList, ok := mdmsData["mdms"].([]interface{})
	if !ok || len(mdmsList) == 0 {
		return finalResponse, errors.New("MDMS data missing or invalid")
	}

	firstEntry := mdmsList[0].(map[string]interface{})
	data := firstEntry["data"].(map[string]interface{})
	workflowData, ok := data["workflow"].(map[string]interface{})
	if !ok {
		return finalResponse, errors.New("no 'workflow' section in MDMS data")
	}

	businessServiceName, ok := workflowData["businessService"].(string)
	if !ok {
		return finalResponse, errors.New("invalid 'businessService' in workflow data")
	}

	// ===================== Workflow Search =====================

	bsResponse, err := ws.SearchBusinessService(request,businessServiceName)
	if err != nil {
		return finalResponse, fmt.Errorf("workflow search failed: %w", err)
	}
	if len(bsResponse.BusinessServices) > 0 {
		log.Println("BusinessService already exists.")

		// ======================== Validate BusinessService with MDMS ==============================

		valid, validation_err := ws.ValidateMDMSBusinessService(workflowData, bsResponse)
		if validation_err != nil {
			log.Printf("Validation failed: %v", err)
			return finalResponse, fmt.Errorf("validation failed: %w", err)
		} else if valid {
			log.Println("MDMS and BusinessService are valid and in sync.")
			return bsResponse, nil
		}

	}

	// ===================== Create BusinessService =====================
	var businessServiceModel model.BusinessService

	//delete(workflowData, "ACTIVE")
	//delete(workflowData, "INACTIVE")

	workflowData["tenantId"] = request.Service.TenantId

	workflowJSON, err := json.Marshal(workflowData)
	if err != nil {
		return finalResponse, fmt.Errorf("error marshalling workflow data: %w", err)
	}

	err = json.Unmarshal(workflowJSON, &businessServiceModel)
	if err != nil {
		return finalResponse, fmt.Errorf("error unmarshalling workflow data: %w", err)
	}

	businessRequest := model.BusinessServiceRequest{
		RequestInfo:      request.RequestInfo,
		BusinessServices: []model.BusinessService{businessServiceModel},
	}

	resp, err := ws.CreateBusinessService(businessRequest)
	if err != nil {
		return finalResponse, fmt.Errorf("create business service failed: %w", err)
	}

	return resp, nil
}

func (ws *WorkflowService) ValidateMDMSBusinessService(mdmsWorkflow map[string]interface{}, response model.BusinessServiceResponse) (bool, error) {
	log.Println("Starting validation of MDMS BusinessService with Workflow response...")

	if len(response.BusinessServices) == 0 {
		log.Println("Validation failed: No business services found in workflow response")
		return false, errors.New("no business service found to validate")
	}

	service := response.BusinessServices[0]
	log.Printf("Validating business service: %s\n", service.BusinessService)

	mdmsBS, ok := mdmsWorkflow["businessService"].(string)
	if !ok {
		log.Println("Validation failed: 'businessService' key is missing or not a string in MDMS data")
		return false, errors.New("'businessService' key missing or invalid in MDMS data")
	}

	if mdmsBS != service.BusinessService {
		log.Printf("Validation failed: Business service name mismatch. MDMS: %s, Workflow: %s\n", mdmsBS, service.BusinessService)
		return false, errors.New("businessService name mismatch")
	}

	mdmsStates, ok := mdmsWorkflow["states"].([]interface{})
	if !ok {
		log.Println("Validation failed: 'states' key missing or not an array in MDMS data")
		return false, errors.New("invalid or missing states in MDMS data")
	}

	log.Printf("Comparing number of states. MDMS: %d, Workflow: %d\n", len(mdmsStates), len(service.States))
	if len(mdmsStates) != len(service.States) {
		log.Println("Validation failed: Number of states mismatch")
		return false, errors.New("states count mismatch between MDMS and Workflow")
	}

	for i, mdmsStateRaw := range mdmsStates {
		log.Printf("Validating state at index %d...\n", i)
		mdmsState, ok := mdmsStateRaw.(map[string]interface{})
		if !ok {
			log.Printf("Validation failed: Invalid state format at index %d\n", i)
			return false, fmt.Errorf("invalid state format at index %d", i)
		}

		if i >= len(service.States) {
			log.Printf("Validation failed: Workflow state missing at index %d\n", i)
			return false, fmt.Errorf("workflow state missing at index %d", i)
		}

		wsState := service.States[i]

		mdmsActions, ok := mdmsState["actions"].([]interface{})
		if !ok {
			log.Printf("No actions to validate for state: %s (assuming optional)\n", wsState.State)
			continue
		}

		log.Printf("Validating actions in state. Length of Actions object in MDMS: %d, Length of Actions object in Workflow: %d\n", len(mdmsActions), len(wsState.Actions))
		if len(mdmsActions) != len(wsState.Actions) {
			log.Printf("Validation failed: Action count mismatch in state '%s'\n", wsState.State)
			return false, fmt.Errorf("action count mismatch in state %s", wsState.State)
		}

		for j, actionRaw := range mdmsActions {
			actionMap, ok := actionRaw.(map[string]interface{})
			if !ok {
				log.Printf("Validation failed: Invalid action format at index %d in state %s\n", j, wsState.State)
				return false, fmt.Errorf("invalid action format in state %s at index %d", wsState.State, j)
			}

			mdmsActionName, _ := actionMap["action"].(string)
			if wsState.Actions[j].Action != mdmsActionName {
				log.Printf("Validation failed: Action name mismatch in state '%s' at index %d. MDMS: %s, Workflow: %s\n",
					wsState.State, j, mdmsActionName, wsState.Actions[j].Action)
				return false, fmt.Errorf("action name mismatch in state %s at index %d", wsState.State, j)
			}
			log.Printf("Action name match in state , at index %d: %s\n", j, mdmsActionName)

			mdmsRolesRaw, ok := actionMap["roles"].([]interface{})
			if !ok {
				log.Printf("Validation failed: Roles missing or invalid for action '%s' in state '%s'\n", mdmsActionName, wsState.State)
				return false, fmt.Errorf("roles missing or invalid in action %s of state %s", mdmsActionName, wsState.State)
			}

			mdmsRoles := make([]string, len(mdmsRolesRaw))
			for k, r := range mdmsRolesRaw {
				mdmsRoles[k], _ = r.(string)
			}

			workflowRoles := wsState.Actions[j].Roles
			if !stringSlicesEqual(mdmsRoles, workflowRoles) {
				log.Printf("Validation failed: Role mismatch in action '%s' of state '%s'. MDMS: %v, Workflow: %v\n",
					mdmsActionName, wsState.State, mdmsRoles, workflowRoles)
				return false, fmt.Errorf("role mismatch in action %s of state %s", mdmsActionName, wsState.State)
			}
			log.Printf("Role match in action '%s' of state : %v\n", mdmsActionName, mdmsRoles)
		}
	}

	log.Println("Validation passed: MDMS and Workflow BusinessService match successfully.")
	return true, nil
}

// stringSlicesEqual checks if two slices contain the same elements (order-independent)
func stringSlicesEqual(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	roleMap := make(map[string]int)
	for _, val := range a {
		roleMap[val]++
	}
	for _, val := range b {
		if roleMap[val] == 0 {
			return false
		}
		roleMap[val]--
	}
	for _, v := range roleMap {
		if v != 0 {
			return false
		}
	}
	return true
}
