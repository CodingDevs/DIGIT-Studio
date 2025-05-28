package service

import (
	"context"
	"encoding/json"
	"log"
	"public-service/model"
	"public-service/repository"
)

type ApplicationService struct {
	repo              *repository.ApplicationRepository
	enrichmentService *EnrichmentService
	workflowIntegrator *WorkflowIntegrator
}

func NewApplicationService(repo *repository.ApplicationRepository, enrichmentService *EnrichmentService,workflowIntegrator *WorkflowIntegrator) *ApplicationService {
	return &ApplicationService{repo: repo, enrichmentService: enrichmentService,workflowIntegrator: workflowIntegrator}
}

func (s *ApplicationService) CreateApplication(ctx context.Context, req model.ApplicationRequest, ServiceCode string) (model.ApplicationResponse, error) {
	return s.repo.CreateUsingKafka(ctx, req, ServiceCode)
}

func (s *ApplicationService) SearchApplication(ctx context.Context, criteria model.SearchCriteria,authToken  string) (model.SearchResponse, error) {
	resp, err := s.repo.SearchWithIndividual(ctx, criteria)
	log.Println(resp)
	if err != nil {
		return resp, err
	}
	if jsonBytes, err := json.MarshalIndent(resp, "", "  "); err == nil {
		log.Printf("Search Application response:\n%s\n", string(jsonBytes))
	} else {
		log.Printf("Search Application respons (raw): %+v\n", resp)
	}
	resp.Application = s.enrichmentService.EnrichApplicationsWithIndividuals(resp.Application, criteria)
	// Prepare RequestInfo with authToken
	requestInfo := model.RequestInfo{
		AuthToken: authToken,
		UserInfo: &model.User{
			
		},
	}

	// Iterate through applications and enrich with workflow data
	for i := range resp.Application {
		err := s.workflowIntegrator.SearchWorkflow(&resp.Application[i], requestInfo)
		if err != nil {
			log.Printf("Error enriching application with workflow: %v", err)
			// Optionally return or continue depending on desired behavior
		}
	}
	return resp, nil
}

func (s *ApplicationService) UpdateApplication(ctx context.Context, req model.ApplicationRequest, serviceCode string) (model.ApplicationResponse, error) {

	return s.repo.UpdateUsingKafka(ctx, req, serviceCode)

}
