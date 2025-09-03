package service

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"public-service/config"
	"public-service/model"
	"public-service/repository"
	"strconv"
	"strings"
	"time"
)



type MDMSV2Service struct {
	restCallRepo repository.RestCallRepository
	db           *sql.DB
}

func NewMDMSV2Service(repo repository.RestCallRepository, db *sql.DB) *MDMSV2Service {
	return &MDMSV2Service{
		restCallRepo: repo,
		db:           db,
	}
}

func (s *MDMSV2Service) SearchMDMS(tenantId, schemaCode string, filters map[string]string, requestInfo model.RequestInfo) (map[string]interface{}, error) {

	url := os.Getenv("MDMS_SERVICE_HOST") + os.Getenv("MDMS_V2_SEARCH_ENDPOINT")
	log.Printf("MDMS Search URL: %s", url)
	payload := model.MDMSV2Request{
		MdmsCriteria: model.MdmsV2Criteria{
			TenantID:   tenantId,
			Filters:    filters,
			SchemaCode: schemaCode,
			Limit:      10,
			Offset:     0,
		},
		RequestInfo: requestInfo,
	}
	log.Printf("MDMS Search Payload: %+v", payload)
	var resp map[string]interface{}
	err := s.restCallRepo.Post(url, payload, &resp)
	if err != nil {
		log.Printf("Error calling MDMS service: %v", err)
		return nil, err
	}
	return resp, nil
}

func (s *MDMSV2Service) createMDMSRoleActionMapping(tenantId string, actionid string, apps model.ServiceRequest) (map[string]interface{}, error) {
	var resp map[string]interface{}
    log.Println(os.Getenv("MDMS_V2_CREATE_ENDPOINT"))
	url := os.Getenv("MDMS_SERVICE_HOST") + os.Getenv("MDMS_V2_CREATE_ENDPOINT") + "/" + "ACCESSCONTROL-ROLEACTIONS.roleactions"
	schemaCode := config.GetEnv("SERVICE_MODULE_NAME") + "." + config.GetEnv("SERVICE_MASTER_NAME")

	filters := map[string]string{
		"service": apps.Service.BusinessService,
		"module":  apps.Service.Module,
	}

	mdmsData, err := s.SearchMDMS(tenantId, schemaCode, filters, apps.RequestInfo)
	if err != nil {
		log.Println("Failed to fetch MDMS:", err)
		return nil, fmt.Errorf("failed to fetch MDMS: %w", err)
	}

	mdmsList, ok := mdmsData["mdms"].([]interface{})
	if !ok || len(mdmsList) == 0 {
		log.Println("MDMS data missing or invalid")
		return nil, fmt.Errorf("mdms data missing or invalid")
	}

	firstEntry, ok := mdmsList[0].(map[string]interface{})
	data, _ := firstEntry["data"].(map[string]interface{})
	accessMdms, _ := data["access"].(map[string]interface{})
	rolesMap, _ := accessMdms["roles"].(map[string]interface{})

	for _, roleList := range rolesMap {
		if list, ok := roleList.([]interface{}); ok {
			for _, r := range list {
				if roleStr, ok := r.(string); ok {
					err := s.createRoleIfNotExists(tenantId, roleStr, apps.RequestInfo)
					if err != nil {
						log.Printf("[ERROR] Failed to create role %s: %v", roleStr, err)
					}
				}
			}
		}
	}

	// Always ensure STUDIO_ADMIN role is created
	_ = s.createRoleIfNotExists(tenantId, "STUDIO_ADMIN", apps.RequestInfo)

	// Prepare role lists
	var creatorRoles, editorRoles, viewerRoles []string

	if cr, ok := rolesMap["creator"].([]interface{}); ok {
		for _, r := range cr {
			if roleStr, ok := r.(string); ok {
				creatorRoles = append(creatorRoles, roleStr)
			}
		}
	}

	if er, ok := rolesMap["editor"].([]interface{}); ok {
		for _, r := range er {
			if roleStr, ok := r.(string); ok {
				editorRoles = append(editorRoles, roleStr)
			}
		}
	}

	if vr, ok := rolesMap["viewer"].([]interface{}); ok {
		for _, r := range vr {
			if roleStr, ok := r.(string); ok {
				viewerRoles = append(viewerRoles, roleStr)
			}
		}
	}

	// Define URL mappings for each role type
	// Add new URLs here as needed for each role type
	roleUrlMappings := map[string][]string{
		"creator": {
			"/" + os.Getenv("MDMS_V2_SEARCH_ENDPOINT"),
			"/public-service/v1/service",
			"/egov-workflow-v2/egov-wf/process/_search",
			"/egov-workflow-v2/egov-wf/businessservice/_search",
			"/health-service-request/service/definition/v1/_search",
			"/" + os.Getenv("MDMS_SEARCH_ENDPOINT"),
			"/health-service-request/service/v1/_search",
			"/health-service-request/service/v1/_create",
			"/inbox/v2/_search",
			"/billing-service/bill/v2/_fetchbill",
			"/collection-services/payments/_create",
			// Add more URLs for creator roles here
		},
		"editor": {
			"/" + os.Getenv("MDMS_V2_SEARCH_ENDPOINT"),
			"/public-service/v1/service",
			"/egov-workflow-v2/egov-wf/process/_search",
			"/egov-workflow-v2/egov-wf/businessservice/_search",
			"/health-service-request/service/definition/v1/_search",
			"/" + os.Getenv("MDMS_SEARCH_ENDPOINT"),
			"/health-service-request/service/v1/_search",
			"/health-service-request/service/v1/_create", 
			"/health-service-request/service/v1/_update", 
			"/inbox/v2/_search",
			"/billing-service/bill/v2/_fetchbill",
			"/collection-services/payments/_create",
			// Add URLs specific to editor roles here
		},
		"viewer": {
			"/" + os.Getenv("MDMS_V2_SEARCH_ENDPOINT"),
			"/public-service/v1/service",
			"/egov-workflow-v2/egov-wf/process/_search",
			"/egov-workflow-v2/egov-wf/businessservice/_search",
			"/health-service-request/service/definition/v1/_search",
			"/" + os.Getenv("MDMS_SEARCH_ENDPOINT"),
			"/inbox/v2/_search",
			
			// Add more URLs for viewer roles here
		},
	}

	// Function to search MDMS and extract action ID
	getActionIdFromUrl := func(searchUrl string) (string, error) {
		filter := map[string]string{
			"url": searchUrl,
		}

		res, err := s.SearchMDMS(tenantId, "ACCESSCONTROL-ACTIONS-TEST.actions-test", filter, apps.RequestInfo)
		if err != nil {
			log.Printf("Error calling MDMS search for URL %s: %v", searchUrl, err)
			return "", err
		}

		// Extract action ID from the response
		if mdmsActionList, ok := res["mdms"].([]interface{}); ok && len(mdmsActionList) > 0 {
			if firstActionEntry, ok := mdmsActionList[0].(map[string]interface{}); ok {
				if actionData, ok := firstActionEntry["data"].(map[string]interface{}); ok {
					if actionIdFloat, ok := actionData["id"].(float64); ok {
						return fmt.Sprintf("%.0f", actionIdFloat), nil
					} else if actionIdInt, ok := actionData["id"].(int); ok {
						return fmt.Sprintf("%d", actionIdInt), nil
					}
				}
			}
		}

		return "", fmt.Errorf("could not extract action ID for URL: %s", searchUrl)
	}

	// Function to create role action mapping
	createRoleActionMapping := func(roleCode, actionId, mappingType string) error {
		actionIDInt,_:= strconv.Atoi(actionId)
		payload := model.MDMSCreateV2Request{
			RequestInfo: apps.RequestInfo,
			MDMS: model.Mdms{
				TenantID:   tenantId,
				SchemaCode: "ACCESSCONTROL-ROLEACTIONS.roleactions",
				Data: model.MdmsRoleActionData{
					RoleCode:   roleCode,
					ActionID:   actionIDInt,
					ActionCode: "",
					TenantID:   tenantId,
				},
				IsActive: true,
			},
		}

		log.Printf("[%s] Posting RoleActionMapping for role: %s with actionId: %s", mappingType, roleCode, actionId)
		b, _ := json.MarshalIndent(payload, "", "  ")
		fmt.Println("Payload:\n", string(b))

		var postResp map[string]interface{}
		err := s.restCallRepo.Post(url, payload, &postResp)
		if err != nil {
			if isDuplicateError(err) {
				log.Printf("[SKIPPED - DUPLICATE] RoleActionMapping already exists for role %s with actionId %s", roleCode, actionId)
				return nil
			}
			log.Printf("Error posting RoleActionMapping for role %s with actionId %s: %v", roleCode, actionId, err)
			return err
		}

		respJSON, _ := json.MarshalIndent(postResp, "", "  ")
		log.Println("Response:\n", string(respJSON))
		return nil
	}

	// Always create RoleActionMapping for STUDIO_ADMIN first
	if err := createRoleActionMapping("STUDIO_ADMIN", actionid, "INIT"); err != nil {
		return nil, err
	}

	// Generic function to post mappings for a role type
	postRoleMappings := func(roleList []string, roleType string) error {
		for _, roleCode := range roleList {
			// Create mapping with original actionid
			if err := createRoleActionMapping(roleCode, actionid, roleType+" (original)"); err != nil {
				return err
			}

			// Create additional mappings based on role type URL configuration
			if urls, exists := roleUrlMappings[roleType]; exists {
				for _, searchUrl := range urls {
					additionalActionId, err := getActionIdFromUrl(searchUrl)
					if err != nil {
						log.Printf("Failed to get action ID for URL %s and role %s: %v", searchUrl, roleCode, err)
						continue // Continue with other URLs instead of failing completely
					}

					log.Printf("Extracted Action ID: %s for URL: %s", additionalActionId, searchUrl)
					
					mappingType := fmt.Sprintf("%s (URL: %s)", roleType, searchUrl)
					if err := createRoleActionMapping(roleCode, additionalActionId, mappingType); err != nil {
						log.Printf("Failed to create mapping for role %s with URL %s: %v", roleCode, searchUrl, err)
						// Continue with other URLs instead of failing completely
						continue
					}
				}
			}
		}
		return nil
	}

	// Post for each role group
	if err := postRoleMappings(creatorRoles, "creator"); err != nil {
		return nil, err
	}
	if err := postRoleMappings(editorRoles, "editor"); err != nil {
		return nil, err
	}
	if err := postRoleMappings(viewerRoles, "viewer"); err != nil {
		return nil, err
	}

	return resp, nil
}

func (s *MDMSV2Service) createRoleIfNotExists(tenantId, roleCode string, reqInfo model.RequestInfo) error {
	log.Println(os.Getenv("MDMS_V2_CREATE_ENDPOINT"))
	roleCreateURL := os.Getenv("MDMS_SERVICE_HOST") + os.Getenv("MDMS_V2_CREATE_ENDPOINT") + "/" + "ACCESSCONTROL-ROLES.roles"
	payload := map[string]interface{}{
		"RequestInfo": reqInfo,
		"Mdms": map[string]interface{}{
			"tenantId":   tenantId,
			"schemaCode": "ACCESSCONTROL-ROLES.roles",
			"data": map[string]interface{}{
				"code":        roleCode,
				"name":        roleCode,
				"description": roleCode,
			},
		},
	}

	var resp map[string]interface{}
	err := s.restCallRepo.Post(roleCreateURL, payload, &resp)
	if err != nil {
		if isDuplicateError(err) {
			log.Printf("[SKIPPED - DUPLICATE] Role already exists: %s", roleCode)
			return nil
		}
		return err
	}

	log.Printf("[CREATED] Role created: %s", roleCode)
	return nil
}

func isDuplicateError(err error) bool {
	if err == nil {
		return false
	}
	errStr := err.Error()
	return strings.Contains(errStr, "DUPLICATE_RECORD") && strings.Contains(errStr, "HTTP 400")
}

func (s *MDMSV2Service) getNextMDMSActionTestID() (int64, error) {
	var newID int64
	query := "SELECT nextval('mdms_action_test_id_sequence')"
	err := s.db.QueryRow(query).Scan(&newID) // assuming s.db is *sql.DB or compatible
	if err != nil {
		log.Printf("Error getting next ID from sequence: %v", err)
		return 0, err
	}
	return newID, nil
}

func (s *MDMSV2Service) createMDMSActionTest(tenantId string, serviceCode string, apps model.ServiceRequest) (map[string]interface{}, error) {

	// Step 1: Get next ID from sequence
	newID, err := s.getNextMDMSActionTestID()
	if err != nil {
		return nil, err
	}
    log.Println(os.Getenv("MDMS_V2_CREATE_ENDPOINT"))
	url := os.Getenv("MDMS_SERVICE_HOST") + os.Getenv("MDMS_V2_CREATE_ENDPOINT") + "/" + "ACCESSCONTROL-ACTIONS-TEST.actions-test"

	payload := model.MDMSCreateV2Request{
		RequestInfo: apps.RequestInfo,
		MDMS: model.Mdms{
			TenantID:   tenantId,
			SchemaCode: "ACCESSCONTROL-ACTIONS-TEST.actions-test",
			Data: model.MdmsActionData{
				ID:           newID,
				URL:          "/public-service/v1/application/" + serviceCode,
				Code:         "",
				Name:         "create OC Application",
				Path:         "",
				Enabled:      false,
				DisplayName:  "Create OC Application",
				OrderNumber:  1,
				ServiceCode:  "public-service",
				ParentModule: "",
			},
			IsActive: true,
		},
	}

	log.Printf("Calling MDMS Create ActionTest\nURL: %s\nPayload: %+v\n", url, payload)

	b, _ := json.MarshalIndent(payload, "", "  ")
	fmt.Println("Final Payload:\n", string(b))

	var resp map[string]interface{}
	err = s.restCallRepo.Post(url, payload, &resp)
	if err != nil {
		log.Printf("Error calling MDMS create ActionTest: %v", err)
		return nil, err
	}

	respJSON, _ := json.MarshalIndent(resp, "", "  ")
	log.Println("MDMS Create ActionTest Response:\n", string(respJSON))
	var roleMappingErr error
	const attempts = 10 //we are doing this aspersister was taking sometimetopersist the above action-test data hence was getting reference doesn't exist error
	for i := 0; i < attempts; i++ {
		_, roleMappingErr = s.createMDMSRoleActionMapping(tenantId, strconv.FormatInt(newID, 10), apps)
		if roleMappingErr == nil {
			break
		}
		if strings.Contains(roleMappingErr.Error(), "REFERENCE_VALIDATION_ERR") && i < attempts-1 {
			log.Println("Retrying RoleActionMapping due to REFERENCE_VALIDATION_ERR...")
			time.Sleep(1 * time.Second)
			continue
		}
		break
	}

	if roleMappingErr != nil {
		log.Printf("Error creating RoleActionMapping: %v", roleMappingErr)
		return resp, roleMappingErr
	}

	return resp, nil
}

func (s *MDMSV2Service) CreateMDMS(tenantId, schemaCode string, data interface{}, requestInfo model.RequestInfo) (map[string]interface{}, error) {

	url := os.Getenv("MDMS_SERVICE_HOST") + os.Getenv("MDMS_V2_CREATE_ENDPOINT") + "/" + schemaCode
    log.Println(os.Getenv("MDMS_V2_CREATE_ENDPOINT"))
	payload := model.MDMSCreateV2Request{
		RequestInfo: requestInfo,
		MDMS: model.Mdms{
			TenantID:   tenantId,
			SchemaCode: schemaCode,
			Data:       data,
			IsActive:   true,
		},
	}

	log.Printf("Calling MDMS Create\nURL: %s\nPayload: %+v\n", url, payload)

	var resp map[string]interface{}
	err := s.restCallRepo.Post(url, payload, &resp)
	if err != nil {
		log.Printf("Error calling MDMS create: %v", err)
		return nil, err
	}

	respJSON, _ := json.MarshalIndent(resp, "", "  ")
	log.Println("MDMS Create Response:\n", string(respJSON))
	return resp, nil
}
