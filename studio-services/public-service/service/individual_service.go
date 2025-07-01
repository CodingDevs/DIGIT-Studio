package service

import (
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
}

func NewIndividualService(repo repository.RestCallRepository) *IndividualService {
	return &IndividualService{
		restCallRepo: repo,
	}
}

func (s *IndividualService) CreateUser(req model.Applicant, info model.RequestInfo) individual.IndividualResponse {
	individualReq := mapToIndividualRequest(req, info)
	log.Println("individualReq", individualReq)
	url := config.GetEnv("INDIVIDUAL_SERVICE_HOST") + config.GetEnv("INDIVIDUAL_CREATE_ENDPOINT")
	var resp individual.IndividualResponse
	err := s.restCallRepo.Post(url, individualReq, &resp)
	if err != nil {
		log.Printf("Error calling create individual API: %v", err)
		return individual.IndividualResponse{}
	}
	return resp
}

func (s *IndividualService) UpdateUser(req model.Applicant, info model.RequestInfo) individual.IndividualResponse {
	individualReq := mapToIndividualRequest(req, info)
	url := config.GetEnv("INDIVIDUAL_SERVICE_HOST") + config.GetEnv("INDIVIDUAL_UPDATE_ENDPOINT")
	var resp individual.IndividualResponse
	err := s.restCallRepo.Post(url, individualReq, &resp)
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

func mapToIndividualRequest(req model.Applicant, info model.RequestInfo) individual.IndividualRequest {

	// You can replace this with actual DOB in future, currently hardcoded
	dobTime := convertMillisecondsToDate(1139529600000)

	// Format as dd/MM/yyyy
	dob := dobTime.Format("02/01/2006")

	mobileStr := strconv.FormatInt(req.MobileNumber, 10)

	individualrequest := individual.Individual{
		IndividualId:       req.UserId,
		IsSystemUser:       true,
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
			Roles: []struct {
				Name     string `json:"name"`
				Code     string `json:"code"`
				TenantId string `json:"tenantId"`
			}{
				{
					Name:     "Citizen",
					Code:     "CITIZEN",
					TenantId: info.UserInfo.TenantId,
				},
			},
			Type:     req.Type,
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
