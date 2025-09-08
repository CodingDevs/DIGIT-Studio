package service

import (
	"context"
	"log"
	"public-service/model"
	"public-service/repository"
)

type PublicService struct {
	repo *repository.PublicRepository
	UpdateServiceHelper *UpdateServiceHelper
}

func NewPublicService(repo *repository.PublicRepository, UpdateServiceHelper *UpdateServiceHelper) *PublicService {
	return &PublicService{repo: repo, UpdateServiceHelper: UpdateServiceHelper}
}

func (s *PublicService) CreateService(ctx context.Context, req model.ServiceRequest, tenantId string, mdmsConfigData map[string]interface{}) (model.ServiceResponse, error) {
	return s.repo.CreateService(ctx, req, tenantId, mdmsConfigData)
}

func (s *PublicService) SearchService(ctx context.Context, criteria model.SearchCriteria) (model.ServiceResponse, error) {
	return s.repo.SearchService(ctx, criteria)
}

func (s *PublicService) UpdateService(ctx context.Context, req model.ServiceRequest, serviceCode string, mdmsConfigData map[string]interface{}) (model.ServiceResponse, error) {

	serviceResponse,err:= s.repo.UpdateService(ctx, req, serviceCode, mdmsConfigData)
	response, _ := s.UpdateServiceHelper.CompareServiceConfigs(ctx, serviceCode, req.Service.Version, mdmsConfigData, req)
	logJSON("Config Comparison Result: ", response)
	
	if response.HasChanges {
		err := s.UpdateServiceHelper.ProcessConfigurationChanges(ctx, response, serviceCode,mdmsConfigData,req)
		if err != nil {
			log.Printf("Warning: Failed to process some configuration changes: %v", err)
			// Continue with the update process even if change processing fails
		}
	}
	return serviceResponse, err
}

