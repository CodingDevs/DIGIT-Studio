package controller

import (
	"context"
	"os"
	//"crypto/internal/fips140/edwards25519/field"
	"encoding/json"
	"log"
	"net/http"
	"public-service/model"
	"public-service/service"
	"public-service/utils"
	"strconv"
	"strings"

	"github.com/gorilla/mux"
)

type ApplicationController struct {
	service            *service.ApplicationService
	workflowIntegrator *service.WorkflowIntegrator
	individualService  *service.IndividualService
	enrichmentService  *service.EnrichmentService
	smsService         *service.SMSService
	indexerService     *service.IndexerService
}

func NewApplicationController(service *service.ApplicationService, workflowIntegrator *service.WorkflowIntegrator, individualService *service.IndividualService, enrichmentService *service.EnrichmentService, smsService *service.SMSService,indexerService *service.IndexerService) *ApplicationController {
	return &ApplicationController{service: service, workflowIntegrator: workflowIntegrator, individualService: individualService, enrichmentService: enrichmentService, smsService: smsService, indexerService: indexerService}
}

func (c *ApplicationController) CreateApplicationHandler(w http.ResponseWriter, r *http.Request) {
	serviceCode := mux.Vars(r)["serviceCode"]

	if serviceCode == "" {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Path variable 'serviceCode' is required")
		return
	}

	var req model.ApplicationRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid request payload: "+err.Error())
		return
	}

	tenantID := r.Header.Get("X-Tenant-Id")
	if tenantID == "" {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Missing header 'X-Tenant-Id'")
		return
	}

	if req.Application.TenantId == "" {
		req.Application.TenantId = tenantID
	}
	if req.Application.ServiceCode == "" {
		req.Application.ServiceCode = serviceCode
	}
	mdmsSearch := service.NewMDMSService(nil)
	//MDMS Search
	fields := mdmsSearch.MdmsSearchWithFilter(req)

	// Print only the fields part
	// fmt.Printf("Fields: %+v\n", fields)

	// Validate the service details against the fields schema
	if err := mdmsSearch.ValidateServiceDetailsWithSchema(req, fields); err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Service details validation failed: "+err.Error())
		return
	}

	req, err = c.enrichmentService.EnrichApplicationsWithIdGen(req,"application")
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Enrichment failed: "+err.Error())
	    return
	}
	log.Println(req)
	for i := range req.Application.Applicants {
		applicant := req.Application.Applicants[i]
		mobile := strconv.FormatInt(applicant.MobileNumber, 10)

		// Log input applicant in JSON
		if data, _ := json.MarshalIndent(applicant, "", "  "); true {
			log.Println("Processing applicant:", string(data))
		}

		criteria := map[string]interface{}{
			"mobileNumber": mobile,
			"tenantId":     req.Application.TenantId,
		}

		// Check if individual exists
		resp := c.individualService.GetIndividual(req.RequestInfo, criteria)
		if data, _ := json.MarshalIndent(resp, "", "  "); true {
			log.Println("GetIndividual response:", string(data))
		}

		if len(resp.Individual) == 0 {
			// If not found, create individual
			createdResp := c.individualService.CreateUser(applicant, req.RequestInfo)
			if data, _ := json.MarshalIndent(createdResp, "", "  "); true {
				log.Println("Created individual response:", string(data))
			}

			if createdResp.Individual.IndividualId != "" {
				req.Application.Applicants[i].UserId = createdResp.Individual.IndividualId
			} else {
				log.Println("Failed to create individual for applicant:", applicant.Name)
				utils.WriteErrorResponse(w, http.StatusInternalServerError, "Failed to create individual")
				return
			}
		} else {
			// Individual exists, update applicant UserId
			req.Application.Applicants[i].UserId = resp.Individual[0].IndividualId
			result := map[string]string{
				"applicant": applicant.Name,
				"userId":    resp.Individual[0].IndividualId,
			}
			if data, _ := json.MarshalIndent(result, "", "  "); true {
				log.Println("Existing individual found:", string(data))
			}
		}
	}

	// Call workflow integrator on success
	err = c.workflowIntegrator.CallWorkflow(&req)
	if err != nil {
		log.Printf("Workflow integration failed: %v", err)
		// Optional: return HTTP error or log only
	}
	ctx := context.Background()
	log.Println("inside CreateApplicationHandler")
	res, err := c.service.CreateApplication(ctx, req, serviceCode)
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}
	_, err2 := c.smsService.SendSMS(req, req.Application.TenantId, req.Application.Applicants)
	if err2 != nil {
		log.Printf("error sending sms  %v",err2)
	}
	log.Printf("ProcessInstance enriched: %+v", res.Application.ProcessInstance)

    err = c.indexerService.SendRequestToIndexerForParallelWorkflow(res, req.RequestInfo, os.Getenv("SAVE_PUBLIC_SERVICE_APPLICATION_TOPIC_INDEXER"))
	if err != nil {
		log.Printf("error sending to indexer topic   %v",err2)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
}

func (c *ApplicationController) SearchApplicationHandler(w http.ResponseWriter, r *http.Request) {
	var criteria model.SearchRequest
	serviceCode := mux.Vars(r)["serviceCode"]

	if serviceCode == "" {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Path variable 'serviceCode' is required")
		return
	}

	tenantID := r.Header.Get("X-Tenant-Id")
	if tenantID == "" {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Missing header 'X-Tenant-Id'")
		return
	}

	AuthToken := r.Header.Get("auth-token")
	if AuthToken == "" {
		http.Error(w, "auth-token header is required", http.StatusBadRequest)
		return
	}

	if criteria.SearchCriteria.TenantId == "" {
		criteria.SearchCriteria.TenantId = tenantID
	}
	if criteria.SearchCriteria.ServiceCode == "" {
		criteria.SearchCriteria.ServiceCode = serviceCode
	}

	module := r.URL.Query().Get("module")
	businessService := r.URL.Query().Get("businessService")
	status := r.URL.Query().Get("status")
	applicationNumber := r.URL.Query().Get("applicationNumber")
	sortBy := r.URL.Query().Get("sortBy")
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil {
			criteria.SearchCriteria.Limit = limit
		}
	}
	if offsetStr := r.URL.Query().Get("offset"); offsetStr != "" {
		if offset, err := strconv.Atoi(offsetStr); err == nil {
			criteria.SearchCriteria.Offset = offset
		}
	}
	if sortBy != "" {
		criteria.SearchCriteria.SortBy = sortBy
	}
	if businessService != "" {
		criteria.SearchCriteria.BusinessService = businessService
	}
	if status != "" {
		criteria.SearchCriteria.Status = status
	}
	if module != "" {
		criteria.SearchCriteria.Module = module
	}
	if applicationNumber != "" {
		criteria.SearchCriteria.ApplicationNumber = applicationNumber
	}
	if idsParam := r.URL.Query().Get("ids"); idsParam != "" {
		criteria.SearchCriteria.Ids = strings.Split(idsParam, ",")
	}
	log.Println("inside search", criteria.SearchCriteria)
	ctx := context.Background()
	res, err := c.service.SearchApplication(ctx, criteria.SearchCriteria,AuthToken)
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}
	//TODO: enrich ProcessInstance as request nfo not there its throwing error
	/*for i := range res.Application {
		err = c.workflowIntegrator.SearchWorkflow(&res.Application[i], criteria.RequestInfo)
		if err != nil {
			log.Printf("Workflow integration failed for application %s: %v", res.Application[i].Id, err)
			// Optional: handle error per item or break early
		}
	}*/
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
}

func (c *ApplicationController) UpdateApplicationHandler(w http.ResponseWriter, r *http.Request) {
	serviceCode := mux.Vars(r)["serviceCode"]

	if serviceCode == ""  {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Path variable 'serviceCode' is required")
		return
	}

	tenantID := r.Header.Get("X-Tenant-Id")
	if tenantID == "" {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Missing header 'X-Tenant-Id'")
		return
	}

	AuthToken := r.Header.Get("auth-token")
	if AuthToken == "" {
		log.Println("auth-token",AuthToken)
	}
    
	var req model.ApplicationRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		log.Printf("Update Service error: %v", err)
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid request payload: "+err.Error())
		return
	}

	log.Println("inside update", req)

	if req.Application.TenantId == "" {
		req.Application.TenantId = tenantID
	}
	if req.Application.ServiceCode == "" {
		req.Application.ServiceCode = serviceCode
	}
	ctx := context.Background()
	req,err =c.enrichmentService.EnrichApplicationsWithDemand(req)
	if err != nil {
		log.Printf("Deamnd Creation failed: %v", err)
		utils.WriteErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}
	// Call workflow integrator on success
	err = c.workflowIntegrator.CallWorkflow(&req)
	if err != nil {
		log.Printf("Workflow integration failed: %v", err)
		utils.WriteErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}
	res, err := c.service.UpdateApplication(ctx, req, serviceCode)
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}
	log.Printf("ProcessInstance enriched: %+v", res.Application.ProcessInstance)
	_, err2 := c.smsService.SendSMS(req, req.Application.TenantId, req.Application.Applicants)
	if err2 != nil {
		log.Printf("error sending sms  %v",err2)
	}
	err = c.indexerService.SendRequestToIndexerForParallelWorkflow(res, req.RequestInfo, os.Getenv("UPDATE_PUBLIC_SERVICE_APPLICATION_TOPIC_INDEXER"))
	if err != nil {
		log.Printf("error sending to indexer topic   %v",err2)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
}


func (c *ApplicationController) CalculateHandler(w http.ResponseWriter, r *http.Request) {
	var req model.ApplicationRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusBadRequest, "Invalid request payload: "+err.Error())
		return
	}

	res, err := c.enrichmentService.GetCalculation(req)
	if err != nil {
		utils.WriteErrorResponse(w, http.StatusInternalServerError, "Calculation error: "+err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
}

