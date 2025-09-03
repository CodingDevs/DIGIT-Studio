package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/google/uuid"
	"github.com/lib/pq"
	"log"
	"public-service/config"
	producer "public-service/kafka/producer"
	"public-service/model"
	"strings"
	"time"
)

type ApplicationRepository struct {
	db            *sql.DB
	publicRepo    *PublicRepository
	kafkaProducer *producer.PublicServiceProducer
}

func NewApplicationRepository(db *sql.DB, publicRepo *PublicRepository, kafkaProducer *producer.PublicServiceProducer) *ApplicationRepository {
	return &ApplicationRepository{db: db, publicRepo: publicRepo, kafkaProducer: kafkaProducer}
}

func (r *ApplicationRepository) SearchWithIndividual(ctx context.Context, criteria model.SearchCriteria) (model.SearchResponse, error) {
	var queryBuilder strings.Builder
	var args []interface{}
	var conditions []string
	argPos := 1
	var existingService model.ServiceResponse
	// Check if service exists
	if criteria.ServiceCode != "" {
		searchServiceCriteria := model.SearchCriteria{
			TenantId:    criteria.TenantId,
			ServiceCode: criteria.ServiceCode,
		}

		existingService, err := r.publicRepo.SearchService(ctx, searchServiceCriteria)
		if err != nil {
			return model.SearchResponse{}, err
		}

		if len(existingService.Services) == 0 {
			return model.SearchResponse{}, errors.New("Service with given serviceCode not present in the application. Please create the service.")
		}
	}	
	
	

	queryBuilder.WriteString(`
		SELECT 
			a.id, a.tenant_id, a.module, a.business_service, a.status, a.channel, a.application_number,
			a.workflow_status, a.service_code, a.service_details, a.additional_details, a.address, a.workflow,
			a.createdby, a.last_modifiedby, a.created_at, a.updated_at, a.version,
			r.id, r.reference_type, r.module, r.tenant_id, r.reference_no, r.active,
			ap.id, ap.type, ap.user_id, ap.active,
			ad.id, ad.document_type, ad.file_store_id, ad.document_uid, ad.additional_details,
			ad.createdby, ad.last_modifiedby, ad.created_at, ad.updated_at
		FROM application a
		LEFT JOIN reference r ON a.id = r.application_id
		LEFT JOIN applicant ap ON a.id = ap.application_id
		LEFT JOIN application_document ad ON ad.application_number = a.application_number
	`)

	// Dynamic filters
	if criteria.TenantId != "" {
		conditions = append(conditions, fmt.Sprintf("a.tenant_id = $%d", argPos))
		args = append(args, criteria.TenantId)
		argPos++
	}
	if criteria.ServiceCode != "" {
		conditions = append(conditions, fmt.Sprintf("a.service_code = $%d", argPos))
		args = append(args, criteria.ServiceCode)
		argPos++
	}
	if len(criteria.Ids) > 0 {
		conditions = append(conditions, fmt.Sprintf("a.id = ANY($%d)", argPos))
		args = append(args, pq.Array(criteria.Ids))
		argPos++
	}
	if criteria.Module != "" {
		conditions = append(conditions, fmt.Sprintf("a.module = $%d", argPos))
		args = append(args, criteria.Module)
		argPos++
	}
	if criteria.BusinessService != "" {
		conditions = append(conditions, fmt.Sprintf("a.business_service = $%d", argPos))
		args = append(args, criteria.BusinessService)
		argPos++
	}
	if criteria.ApplicationNumber != "" {
		conditions = append(conditions, fmt.Sprintf("a.application_number = $%d", argPos))
		args = append(args, criteria.ApplicationNumber)
		argPos++
	}
	if criteria.Status != "" {
		conditions = append(conditions, fmt.Sprintf("a.status = $%d", argPos))
		args = append(args, criteria.Status)
		argPos++
	}
	if existingService.Services[0].Version 	> 0 {
		conditions = append(conditions, fmt.Sprintf("a.version = $%d", argPos))
		args = append(args, existingService.Services[0].Version)
		argPos++
	}

	//TODO: need to see this process 
	if criteria.UserId != "" {
		conditions = append(conditions, fmt.Sprintf("ap.user_id = $%d", argPos))
		args = append(args, criteria.UserId)
		argPos++
	} else if criteria.CreatedBy != "" {
		conditions = append(conditions, fmt.Sprintf("a.createdby = $%d", argPos))
		args = append(args, criteria.CreatedBy)
		argPos++
	}
	if len(conditions) > 0 {
		queryBuilder.WriteString(" WHERE ")
		queryBuilder.WriteString(strings.Join(conditions, " AND "))
	}

	// Apply sorting if provided
	if criteria.SortBy != "" {
		queryBuilder.WriteString(fmt.Sprintf(" ORDER BY %s", criteria.SortBy))
	}

	// Apply pagination if limit is set
	if criteria.Limit > 0 {
		queryBuilder.WriteString(fmt.Sprintf(" LIMIT $%d", argPos))
		args = append(args, criteria.Limit)
		argPos++
		// Offset is meaningful only if limit is set
		if criteria.Offset > 0 {
			queryBuilder.WriteString(fmt.Sprintf(" OFFSET $%d", argPos))
			args = append(args, criteria.Offset)
			argPos++
		}
	}

	log.Println("query in search:", queryBuilder.String())
	rows, err := r.db.QueryContext(ctx, queryBuilder.String(), args...)
	if err != nil {
		return model.SearchResponse{}, err
	}
	defer rows.Close()

	var applications []model.Application
	appMap := make(map[uuid.UUID]*model.Application)

	for rows.Next() {
		var (
			appId                                                                                              uuid.UUID
			tenantId, module, businessService, status, channel, applicationNumber, workflowStatus, serviceCode string
			serviceDetailsJSON, additionalDetailsJSON, addressJSON, workflowJSON                               []byte
			createdBy, lastModifiedBy                                                                          uuid.UUID
			createdAt, updatedAt                                                                               time.Time
            version                                                                                           int
			refId, refType, refModule, refTenantId, refNo sql.NullString
			refActive                                     sql.NullBool

			applicantId, applicantType, applicantUserId sql.NullString
			applicantActive                             sql.NullBool

			// document
			docId                           uuid.UUID
			docType, fileStoreId, docUid    sql.NullString
			docAdditionalDetailsJSON        []byte
			docCreatedBy, docLastModifiedBy uuid.UUID
			docCreatedAt, docUpdatedAt      sql.NullTime
		
		)

		err := rows.Scan(
			&appId, &tenantId, &module, &businessService, &status, &channel, &applicationNumber,
			&workflowStatus, &serviceCode, &serviceDetailsJSON, &additionalDetailsJSON, &addressJSON, &workflowJSON,
			&createdBy, &lastModifiedBy, &createdAt, &updatedAt,&version,
			&refId, &refType, &refModule, &refTenantId, &refNo, &refActive,
			&applicantId, &applicantType, &applicantUserId, &applicantActive,
			&docId, &docType, &fileStoreId, &docUid, &docAdditionalDetailsJSON,
			&docCreatedBy, &docLastModifiedBy, &docCreatedAt, &docUpdatedAt,
		)
		if err != nil {
			return model.SearchResponse{}, err
		}

		app, exists := appMap[appId]
		if !exists {
			app = &model.Application{
				Id:                appId,
				TenantId:          tenantId,
				Module:            module,
				BusinessService:   businessService,
				Status:            model.Status(status),
				Channel:           channel,
				ApplicationNumber: applicationNumber,
				WorkflowStatus:    workflowStatus,
				ServiceCode:       serviceCode,
				AuditDetails: model.AuditDetails{
					CreatedBy:        createdBy,
					LastModifiedBy:   lastModifiedBy,
					CreatedTime:      createdAt.UnixMilli(),
					LastModifiedTime: updatedAt.UnixMilli(),
				},
				Version:          version,
			}

			_ = json.Unmarshal(serviceDetailsJSON, &app.ServiceDetails)
			_ = json.Unmarshal(additionalDetailsJSON, &app.AdditionalDetails)
			_ = json.Unmarshal(addressJSON, &app.Address)
			_ = json.Unmarshal(workflowJSON, &app.Workflow)

			appMap[appId] = app
		}

		if refId.Valid {
			ref := model.Reference{
				Id:            uuid.MustParse(refId.String),
				ReferenceType: refType.String,
				Module:        refModule.String,
				TenantId:      refTenantId.String,
				ReferenceNo:   refNo.String,
				Active:        refActive.Bool,
			}
			app.Reference = append(app.Reference, ref)
		}

		if applicantId.Valid {
			applicant := model.Applicant{
				Id:     uuid.MustParse(applicantId.String),
				Type:   applicantType.String,
				UserId: applicantUserId.String,
				Active: applicantActive.Bool,
			}
		
			// Prevent duplicate applicants
			alreadyExists := false
			for _, existing := range app.Applicants {
				if existing.Id == applicant.Id {
					alreadyExists = true
					break
				}
			}
			if !alreadyExists {
				app.Applicants = append(app.Applicants, applicant)
			}
		}

		// Document
		if docId != uuid.Nil {
			doc := model.Document{
				ID:           docId.String(),
				DocumentType: docType.String,
				FileStoreID:  fileStoreId.String,
				DocumentUID:  docUid.String,
				AuditDetails: model.AuditDetails{
					CreatedBy:      docCreatedBy,
					LastModifiedBy: docLastModifiedBy,
				},
			}
			if docCreatedAt.Valid {
				doc.AuditDetails.CreatedTime = docCreatedAt.Time.UnixMilli()
			}
			if docUpdatedAt.Valid {
				doc.AuditDetails.LastModifiedTime = docUpdatedAt.Time.UnixMilli()
			}
			_ = json.Unmarshal(docAdditionalDetailsJSON, &doc.AdditionalDetails)
			app.Documents = append(app.Documents, doc)
		}
	}

	for _, app := range appMap {
		applications = append(applications, *app)
	}

	return model.SearchResponse{
		Application: applications,
		ResponseInfo: model.ResponseInfo{
			Status: "successful",
		},
	}, nil
}

func (r *ApplicationRepository) CreateUsingKafka(ctx context.Context, req model.ApplicationRequest, serviceCode string) (model.ApplicationResponse, error) {
	searchServiceCriteria := model.SearchCriteria{
		TenantId:    req.Application.TenantId,
		ServiceCode: serviceCode,
	}
	existingService, _ := r.publicRepo.SearchService(ctx, searchServiceCriteria)
	if len(existingService.Services) == 0 {
		return model.ApplicationResponse{}, errors.New("Service with given serviceCode not present in the application. Please create service.")
	}

	if req.RequestInfo.UserInfo == nil {
		req.RequestInfo.UserInfo = &model.User{}
	}
	if req.RequestInfo.UserInfo.Uuid == uuid.Nil {
		req.RequestInfo.UserInfo.Uuid = uuid.New()
	}
	createdBy := req.RequestInfo.UserInfo.Uuid
	appID := uuid.New()

	req.RequestInfo.UserInfo.Uuid = createdBy
	req.Application.Id = appID
	req.Application.Address.Id = uuid.New()
	req.Application.Workflow.Id = uuid.New()

	// Generate IDs for references
	for i := range req.Application.Reference {
		req.Application.Reference[i].Id = uuid.New()
	}

	// Generate IDs for applicants
	for i := range req.Application.Applicants {
		req.Application.Applicants[i].Id = uuid.New()
	}

	// Set audit info
	nowMillis := time.Now().UnixMilli()
	req.Application.AuditDetails = model.AuditDetails{
		CreatedBy:        createdBy,
		LastModifiedBy:   createdBy,
		CreatedTime:      nowMillis,
		LastModifiedTime: nowMillis,
	}
	req.Application.Version = 1

	// Enrich documents with ID and audit info
	for i := range req.Application.Documents {
		req.Application.Documents[i].ID = uuid.New().String()
		req.Application.Documents[i].AuditDetails = model.AuditDetails{
			CreatedBy:        createdBy,
			LastModifiedBy:   createdBy,
			CreatedTime:      nowMillis,
			LastModifiedTime: nowMillis,
		}
	}

	// Marshal and push to Kafka
	if r.kafkaProducer != nil {
		messageBytes, err := json.Marshal(req)
		if err != nil {
			log.Printf("failed to marshal kafka message: %v", err)
			return model.ApplicationResponse{}, err
		}

		err = r.kafkaProducer.Push(ctx, config.GetEnv("SAVE_PUBLIC_SERVICE_APPLICATION_TOPIC"), messageBytes)
		if err != nil {
			log.Printf("failed to push kafka message: %v", err)
			return model.ApplicationResponse{}, err
		}
		err = r.kafkaProducer.Push(ctx, config.GetEnv("SAVE_PUBLIC_SERVICE_APPLICATION_TOPIC_INDEXER"), messageBytes)
		if err != nil {
			log.Printf("failed to push kafka to indexer message: %v", err)
			return model.ApplicationResponse{}, err
		}
	} else {
		return model.ApplicationResponse{}, errors.New("Kafka producer is not initialized")
	}

	// Return enriched response
	return model.ApplicationResponse{
		ResponseInfo: model.ResponseInfo{
			ApiId:    req.RequestInfo.ApiId,
			Ver:      req.RequestInfo.Ver,
			UserInfo: *req.RequestInfo.UserInfo,
		},
		Application: req.Application,
	}, nil
}

func (r *ApplicationRepository) UpdateUsingKafka(ctx context.Context, req model.ApplicationRequest, serviceCode string) (model.ApplicationResponse, error) {
	nowMillis := time.Now().UnixMilli()

	// Validate that the application exists
	searchCriteria := model.SearchCriteria{
		TenantId:    req.Application.TenantId,
		ServiceCode: serviceCode,
		Ids:         []string{req.Application.Id.String()},
	}

	existingService, _ := r.SearchWithIndividual(ctx, searchCriteria)
	if len(existingService.Application) == 0 {
		return model.ApplicationResponse{}, errors.New("Service with given serviceCode and applicationId not present in the application.")
	}

	// Ensure UserInfo is present
	if req.RequestInfo.UserInfo == nil {
		req.RequestInfo.UserInfo = &model.User{}
	}
	if req.RequestInfo.UserInfo.Uuid == uuid.Nil {
		req.RequestInfo.UserInfo.Uuid = uuid.New()
	}
	modifiedBy := req.RequestInfo.UserInfo.Uuid

	// Enrich application with audit info
	req.Application.AuditDetails.LastModifiedBy = modifiedBy
	req.Application.AuditDetails.LastModifiedTime = nowMillis
    req.Application.Version = existingService.Application[0].Version + 1
	// Enrich documents with ID and audit info
	for i := range req.Application.Documents {
		if req.Application.Documents[i].ID == "" {
			req.Application.Documents[i].ID = uuid.New().String()
		}
		req.Application.Documents[i].AuditDetails = model.AuditDetails{
			LastModifiedBy:   modifiedBy,
			LastModifiedTime: nowMillis,
		}
	}

	// Marshal request into JSON
	kafkaPayload, err := json.Marshal(req)
	if err != nil {
		return model.ApplicationResponse{}, fmt.Errorf("failed to marshal application request for Kafka: %w", err)
	}

	// Publish to Kafka topic
	if r.kafkaProducer != nil {
		err = r.kafkaProducer.Push(ctx, config.GetEnv("UPDATE_PUBLIC_SERVICE_APPLICATION_TOPIC"), kafkaPayload)
		if err != nil {
			log.Printf("failed to push to kafka to save application message: %v", err)
			return model.ApplicationResponse{}, err
		}
		err = r.kafkaProducer.Push(ctx, config.GetEnv("UPDATE_PUBLIC_SERVICE_APPLICATION_TOPIC_INDEXER"), kafkaPayload)
		if err != nil {
			log.Printf("failed to push kafka to indexer message: %v", err)
			return model.ApplicationResponse{}, err
		}
	} else {
		return model.ApplicationResponse{}, errors.New("Kafka producer is not initialized")
	}

	// Return the enriched response
	return model.ApplicationResponse{
		ResponseInfo: model.ResponseInfo{
			ApiId:    req.RequestInfo.ApiId,
			Ver:      req.RequestInfo.Ver,
			UserInfo: *req.RequestInfo.UserInfo,
		},
		Application: req.Application,
	}, nil
}

func (r *ApplicationRepository) DeleteMDMSSchema(ctx context.Context, schemaCode, tenantId string) error {
	// Validate input to prevent accidental mass deletion
	if strings.TrimSpace(schemaCode) == "" || strings.TrimSpace(tenantId) == "" {
		return errors.New("schemaCode and tenantId must not be empty")
	}

	query := `DELETE FROM eg_mdms_schema_definition WHERE code = $1 AND tenantid = $2`

	_, err := r.db.ExecContext(ctx, query, schemaCode, tenantId)
	if err != nil {
		log.Printf("failed to delete MDMS schema data for code=%s and tenantId=%s: %v", schemaCode, tenantId, err)
		return err
	}

	log.Printf("successfully deleted MDMS schema data for schemaCode=%s and tenantId=%s", schemaCode, tenantId)
	return nil
}

