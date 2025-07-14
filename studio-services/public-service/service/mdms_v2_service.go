package service

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"public-service/model"
	"public-service/repository"
	"strconv"
	"strings"
	"time"
	"public-service/config"
)

const (
	RoleActionCreatePath = "egov-mdms-service/v2/_create/ACCESSCONTROL-ROLEACTIONS.roleactions"
	ActionTestCreatePath = "egov-mdms-service/v2/_create/ACCESSCONTROL-ACTIONS-TEST.actions-test"
	DocumentCreatePath = "egov-mdms-service/v2/_create/DigitStudio.DocumentConfig2"
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

func (s *MDMSV2Service) SearchMDMS(tenantId, schemaCode string, filters map[string]string,requestInfo model.RequestInfo) (map[string]interface{}, error) {

	url := os.Getenv("MDMS_SERVICE_HOST") + os.Getenv("MDMS_V2_SEARCH_ENDPOINT")

	payload := model.MDMSV2Request{
		MdmsCriteria: model.MdmsV2Criteria{
			TenantID:   tenantId,
			Filters: filters,
			SchemaCode: schemaCode,
			Limit:      10,
			Offset:     0,
		},
		RequestInfo: requestInfo,
	}

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

	url := os.Getenv("MDMS_SERVICE_HOST") + RoleActionCreatePath
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
	// Always create RoleActionMapping for STUDIO_ADMIN first
	studioAdminPayload := model.MDMSCreateV2Request{
		RequestInfo: apps.RequestInfo,
		MDMS: model.Mdms{
			TenantID:   tenantId,
			SchemaCode: "ACCESSCONTROL-ROLEACTIONS.roleactions",
			Data: model.MdmsRoleActionData{
				RoleCode:   "STUDIO_ADMIN",
				ActionID:   actionid,
				ActionCode: "",
				TenantID:   tenantId,
			},
			IsActive: true,
		},
	}

	log.Println("[INIT] Posting RoleActionMapping for role: STUDIO_ADMIN")
	b, _ := json.MarshalIndent(studioAdminPayload, "", "  ")
	fmt.Println("Payload:\n", string(b))

	if err := s.restCallRepo.Post(url, studioAdminPayload, &resp); err != nil {
		if isDuplicateError(err) {
			log.Println("[SKIPPED - DUPLICATE] RoleActionMapping already exists for STUDIO_ADMIN")
		} else {
			log.Printf("Error posting RoleActionMapping for STUDIO_ADMIN: %v", err)
			return nil, err
		}
	}

	respJSON, _ := json.MarshalIndent(resp, "", "  ")
	log.Println("Response:\n", string(respJSON))

	// Helper function to post for each role
	postRoleMappings := func(roleList []string, roleType string) error {
		for _, roleCode := range roleList {
			payload := model.MDMSCreateV2Request{
				RequestInfo: apps.RequestInfo,
				MDMS: model.Mdms{
					TenantID:   tenantId,
					SchemaCode: "ACCESSCONTROL-ROLEACTIONS.roleactions",
					Data: model.MdmsRoleActionData{
						RoleCode:   roleCode,
						ActionID:   actionid,
						ActionCode: "",
						TenantID:   tenantId,
					},
					IsActive: true,
				},
			}

			log.Printf("[%s] Posting RoleActionMapping for role: %s", roleType, roleCode)
			b, _ := json.MarshalIndent(payload, "", "  ")
			fmt.Println("Payload:\n", string(b))

			var postResp map[string]interface{}
			err := s.restCallRepo.Post(url, payload, &postResp)
			if err != nil {
				// Check if the error is a duplicate record error
				if isDuplicateError(err) {
					log.Printf("[SKIPPED - DUPLICATE] RoleActionMapping already exists for role %s", roleCode)
					continue
				}
				log.Printf("Error posting RoleActionMapping for role %s: %v", roleCode, err)
				return err
			}

			respJSON, _ := json.MarshalIndent(postResp, "", "  ")
			log.Println("Response:\n", string(respJSON))
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

	url := os.Getenv("MDMS_SERVICE_HOST") + ActionTestCreatePath

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
	const attempts = 10    //we are doing this aspersister was taking sometimetopersist the above action-test data hence was getting reference doesn't exist error 
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