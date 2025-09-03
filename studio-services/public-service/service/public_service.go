package service

import (
	"context"
	"public-service/model"
	"public-service/repository"
)

type PublicService struct {
	repo *repository.PublicRepository
}

func NewPublicService(repo *repository.PublicRepository) *PublicService {
	return &PublicService{repo: repo}
}

func (s *PublicService) CreateService(ctx context.Context, req model.ServiceRequest, tenantId string, mdmsConfigData map[string]interface{}) (model.ServiceResponse, error) {
	return s.repo.CreateService(ctx, req, tenantId, mdmsConfigData)
}

func (s *PublicService) SearchService(ctx context.Context, criteria model.SearchCriteria) (model.ServiceResponse, error) {
	return s.repo.SearchService(ctx, criteria)
}

func (s *PublicService) UpdateService(ctx context.Context, req model.ServiceRequest, serviceCode string, mdmsConfigData map[string]interface{}) (model.ServiceResponse, error) {
	return s.repo.UpdateService(ctx, req, serviceCode, mdmsConfigData)
}
