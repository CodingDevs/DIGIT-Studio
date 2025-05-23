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
)

const (
	RoleActionCreatePath = "egov-mdms-service/v2/_create/ACCESSCONTROL-ROLEACTIONS.roleactions"
	ActionTestCreatePath = "egov-mdms-service/v2/_create/ACCESSCONTROL-ACTIONS-TEST.actions-test"
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

func (s *MDMSV2Service) SearchMDMS(tenantId, schemaCode, serviceName, module string, requestInfo model.RequestInfo) (map[string]interface{}, error) {

	url := os.Getenv("MDMS_SERVICE_HOST") + os.Getenv("MDMS_V2_SEARCH_ENDPOINT")

	payload := model.MDMSV2Request{
		MdmsCriteria: model.MdmsV2Criteria{
			TenantID:   tenantId,
			Filters:    map[string]string{"service": serviceName, "module": module},
			SchemaCode: schemaCode,
			Limit:      10,
			Offset:     0,
		},
		RequestInfo: requestInfo,
	}
	log.Println("url", url)
	log.Println("payload", payload)

	var resp map[string]interface{}
	err := s.restCallRepo.Post(url, payload, &resp)
	if err != nil {
		log.Printf("Error calling MDMS service: %v", err)
		return nil, err
	}
	respJSON, _ := json.MarshalIndent(resp, "", "  ")
	log.Println("MDMS Response:\n", string(respJSON))
	return resp, nil
}

func (s *MDMSV2Service) createMDMSRoleActionMapping(tenantId string, actionid string, requestInfo model.RequestInfo) (map[string]interface{}, error) {

	url := os.Getenv("MDMS_SERVICE_HOST") + RoleActionCreatePath

	payload := model.MDMSCreateV2Request{
		RequestInfo: requestInfo,
		MDMS: model.Mdms{
			TenantID:   tenantId,
			SchemaCode: "ACCESSCONTROL-ROLEACTIONS.roleactions",
			Data: model.MdmsRoleActionData{
				RoleCode:   "STUDIO_ADMIN",
				ActionID:   actionid,
				ActionCode: "", // Use nil if you want actual JSON null
				TenantID:   tenantId,
			},
			IsActive: true,
		},
	}

	log.Printf("Calling MDMS Create RoleActionMapping\nURL: %s\nPayload: %+v\n", url, payload)
	b, _ := json.MarshalIndent(payload, "", "  ")
	fmt.Println("Final Payload:\n", string(b))

	var resp map[string]interface{}
	err := s.restCallRepo.Post(url, payload, &resp)
	if err != nil {
		log.Printf("Error calling MDMS create RoleActionMapping: %v", err)
		return nil, err
	}

	respJSON, _ := json.MarshalIndent(resp, "", "  ")
	log.Println("MDMS Create RoleActionMapping Response:\n", string(respJSON))
	return resp, nil
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

func (s *MDMSV2Service) createMDMSActionTest(tenantId string, serviceCode string, requestInfo model.RequestInfo) (map[string]interface{}, error) {

	// Step 1: Get next ID from sequence
	newID, err := s.getNextMDMSActionTestID()
	if err != nil {
		return nil, err
	}

	url := os.Getenv("MDMS_SERVICE_HOST") + ActionTestCreatePath

	payload := model.MDMSCreateV2Request{
		RequestInfo: requestInfo,
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
		_, roleMappingErr = s.createMDMSRoleActionMapping(tenantId, strconv.FormatInt(newID, 10), requestInfo)
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
