package service

import (
	"encoding/json"
	"log"
	"public-service/config"
	"public-service/model"
	"public-service/model/individual"
	"public-service/repository"
	"strconv"
	"time"
)

type IndividualService struct {
	restCallRepo repository.RestCallRepository
	mdms         MDMSV2Service
}

func NewIndividualService(repo repository.RestCallRepository, mdms MDMSV2Service) *IndividualService {
	return &IndividualService{
		restCallRepo: repo,
		mdms:         mdms,
	}
}

func (s *IndividualService) CreateUser(req model.Applicant, info model.RequestInfo, application model.Application) individual.IndividualResponse {
	schemaCode := config.GetEnv("SERVICE_MODULE_NAME") + "." + config.GetEnv("SERVICE_MASTER_NAME")
	filters := map[string]string{
		"service": application.BusinessService,
		"module":  application.Module,
	}

	mdmsData, err := s.mdms.SearchMDMS(application.TenantId, schemaCode, filters, info)
	if err != nil {
		log.Println("Failed to fetch MDMS:", err)
		return individual.IndividualResponse{}
	}

	mdmsList, ok := mdmsData["mdms"].([]interface{})
	if !ok || len(mdmsList) == 0 {
		log.Println("MDMS data missing or invalid")
		return individual.IndividualResponse{}
	}

	firstEntry, ok := mdmsList[0].(map[string]interface{})
	data, _ := firstEntry["data"].(map[string]interface{})
	applicantMDMS, _ := data["applicant"].(map[string]interface{})
	configMap, _ := applicantMDMS["config"].(map[string]interface{})

	individualReq := mapToIndividualRequest(req, info, configMap)

	individualJSON, err := json.MarshalIndent(individualReq, "", "  ")
	if err != nil {
		log.Println("Error marshaling individualReq:", err)
	} else {
		log.Println("individualReq JSON:", string(individualJSON))
	}
	url := config.GetEnv("INDIVIDUAL_SERVICE_HOST") + config.GetEnv("INDIVIDUAL_CREATE_ENDPOINT")
	var resp individual.IndividualResponse
	err = s.restCallRepo.Post(url, individualReq, &resp)
	if err != nil {
		log.Printf("Error calling create individual API: %v", err)
		return individual.IndividualResponse{}
	}
	return resp
}


func (s *IndividualService) UpdateUser(req model.Applicant, info model.RequestInfo, application model.Application) individual.IndividualResponse {
	schemaCode := config.GetEnv("SERVICE_MODULE_NAME") + "." + config.GetEnv("SERVICE_MASTER_NAME")
	filters := map[string]string{
		"service": application.BusinessService,
		"module":  application.Module,
	}

	mdmsData, err := s.mdms.SearchMDMS(application.TenantId, schemaCode, filters, info)
	if err != nil {
		log.Println("Failed to fetch MDMS:", err)
		return individual.IndividualResponse{}
	}

	mdmsList, ok := mdmsData["mdms"].([]interface{})
	if !ok || len(mdmsList) == 0 {
		log.Println("MDMS data missing or invalid")
		return individual.IndividualResponse{}
	}

	firstEntry, ok := mdmsList[0].(map[string]interface{})
	data, _ := firstEntry["data"].(map[string]interface{})
	applicantMDMS, _ := data["applicant"].(map[string]interface{})
	configMap, _ := applicantMDMS["config"].(map[string]interface{})
	individualReq := mapToIndividualRequest(req, info, configMap)
	url := config.GetEnv("INDIVIDUAL_SERVICE_HOST") + config.GetEnv("INDIVIDUAL_UPDATE_ENDPOINT")
	var resp individual.IndividualResponse
	err = s.restCallRepo.Post(url, individualReq, &resp)
	if err != nil {
		log.Printf("Error calling update individual API: %v", err)
		return individual.IndividualResponse{}
	}
	return resp
}

func (s *IndividualService) GetIndividual(requestInfo model.RequestInfo, criteria map[string]interface{}) individual.IndividualBulkResponse {
	// Ensure UserInfo is not nil to avoid panic in downstream code/logs
	if requestInfo.UserInfo == nil {
		requestInfo.UserInfo = &model.User{}
	}

	tenantId := requestInfo.UserInfo.TenantId
	if tenantId == "" {
		tenantId = getString(criteria["tenantId"])
		requestInfo.UserInfo.TenantId = tenantId // update requestInfo for consistency
	}

	ind := individual.IndividualSearch{}

	if uuid := getString(criteria["uuid"]); uuid != "" {

		ind.IndividualId = []string{uuid}
	}
	if mobile := getString(criteria["mobileNumber"]); mobile != "" {
		ind.MobileNumber = []string{mobile}
	}

	searchReq := individual.IndividualSearchRequest{
		RequestInfo: requestInfo,
		Individual:  ind,
	}

	url := config.GetEnv("INDIVIDUAL_SERVICE_HOST") + config.GetEnv("INDIVIDUAL_SEARCH_ENDPOINT") +
		"?limit=1000&offset=0&tenantId=" + tenantId

	var resp individual.IndividualBulkResponse
	err := s.restCallRepo.Post(url, searchReq, &resp)
	if err != nil {
		log.Printf("Error fetching individual: %v", err)
		return individual.IndividualBulkResponse{}
	}
	return resp
}

// Helper functions

func mapToIndividualRequest(req model.Applicant, info model.RequestInfo, config map[string]interface{}) individual.IndividualRequest {
	// Hardcoded DOB (can be replaced with actual DOB from `req` if needed)
	dobTime := convertMillisecondsToDate(1139529600000)
	dob := dobTime.Format("02/01/2006")
	mobileStr := strconv.FormatInt(req.MobileNumber, 10)

	// Extract system user flag from config
	isSystemUser := false
	if val, ok := config["systemUser"].(bool); ok {
		isSystemUser = val
	}

	// Extract system roles from config
	roles := []struct {
		Name     string `json:"name"`
		Code     string `json:"code"`
		TenantId string `json:"tenantId"`
	}{}
	if roleList, ok := config["systemRoles"].([]interface{}); ok {
		for _, r := range roleList {
			if roleStr, ok := r.(string); ok {
				roles = append(roles, struct {
					Name     string `json:"name"`
					Code     string `json:"code"`
					TenantId string `json:"tenantId"`
				}{
					Name:     roleStr,
					Code:     roleStr,
					TenantId: info.UserInfo.TenantId,
				})
			}
		}
	}

	// Extract user type from config (default to "CITIZEN" if missing)
	userType := "CITIZEN"
	if val, ok := config["systemUserType"].(string); ok {
		userType = val
	}

	individualrequest := individual.Individual{
		IndividualId:       req.UserId,
		IsSystemUser:       isSystemUser,
		IsSystemUserActive: req.Active,
		Name: &individual.Name{
			GivenName: req.Name,
		},
		Gender:       ptrToGender(individual.GenderOther),
		Email:        req.EmailId,
		MobileNumber: mobileStr,
		DateOfBirth:  dob,
		TenantId:     info.UserInfo.TenantId,
		UserDetails: &individual.UserDetail{
			UserName: mobileStr,
			TenantId: info.UserInfo.TenantId,
			Roles:    roles,
			Type:     userType,
		},
	}

	return individual.IndividualRequest{
		RequestInfo: info,
		Individual:  individualrequest,
	}
}


func convertMillisecondsToDate(ms int64) *time.Time {
	t := time.UnixMilli(ms)
	return &t
}

// Utility functions
func getString(val interface{}) string {
	if str, ok := val.(string); ok {
		return str
	}
	return ""
}

func ptrToGender(g individual.Gender) *individual.Gender {
	return &g
}
