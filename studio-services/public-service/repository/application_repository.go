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
	"strconv"
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

// Create Application
func (r *ApplicationRepository) Create(ctx context.Context, req model.ApplicationRequest, serviceCode string) (model.ApplicationResponse, error) {
	searchServiceCriteria := model.SearchCriteria{
		TenantId:    req.Application.TenantId,
		ServiceCode: serviceCode,
	}
	existingService, _ := r.publicRepo.SearchService(ctx, searchServiceCriteria)
	if len(existingService.Services) == 0 {
		return model.ApplicationResponse{}, errors.New("Service with given serviceCode not present in the application .please create service.")
	}

	/*searchCriteria := model.SearchCriteria{
		TenantId:        req.Application.TenantId,
		Module:          req.Application.Module,
		BusinessService: req.Application.BusinessService,
		ServiceCode:     serviceCode,
	}
	log.Println("searchCriteria : ", searchCriteria)
	existingApps, _ := r.Search(ctx, searchCriteria)
	log.Println("existingApps : ", existingApps)
	if len(existingApps.Application) > 0 {
		return model.ApplicationResponse{}, errors.New("application already exists with same tenantid,businessservice ,servicecode and module")
	}*/

	now := time.Now()
	if req.RequestInfo.UserInfo == nil {
		req.RequestInfo.UserInfo = &model.User{}
	}

	if req.RequestInfo.UserInfo.Uuid == uuid.Nil {
		req.RequestInfo.UserInfo.Uuid = uuid.New()
	}

	createdBy := req.RequestInfo.UserInfo.Uuid
	appID := uuid.New()

	// Set missing IDs
	req.Application.Address.Id = uuid.New()
	req.Application.Workflow.Id = uuid.New()
	req.RequestInfo.UserInfo.Uuid = createdBy

	// Always generate new Application Number
	req.Application.ApplicationNumber, _ = r.generateApplicationNumber(ctx, req.Application.TenantId, req.Application.Module, req.Application.BusinessService)

	// Marshal complex fields
	serviceDetailsJSON, _ := json.Marshal(req.Application.ServiceDetails)
	additionalDetailsJSON, _ := json.Marshal(req.Application.AdditionalDetails)
	addressJSON, _ := json.Marshal(req.Application.Address)
	workflowJSON, _ := json.Marshal(req.Application.Workflow)

	insertQuery := `
		INSERT INTO application (
			id, tenant_id, module, business_service, status, channel, application_number,
			workflow_status, service_code,service_details, additional_details, address, workflow,
			createdby, last_modifiedby, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7,
			$8, $9, $10, $11, $12,
			$13, $14, $15, $16, $17
		)
	`
	_, err := r.db.ExecContext(ctx, insertQuery,
		appID,
		req.Application.TenantId,
		req.Application.Module,
		req.Application.BusinessService,
		req.Application.Status,
		req.Application.Channel,
		req.Application.ApplicationNumber,
		req.Application.WorkflowStatus,
		serviceCode,
		serviceDetailsJSON,
		additionalDetailsJSON,
		addressJSON,
		workflowJSON,
		createdBy,
		createdBy,
		now,
		now,
	)
	if err != nil {
		return model.ApplicationResponse{}, err
	}

	// Insert References
	for i, ref := range req.Application.Reference {
		refID := uuid.New()
		refQuery := `
			INSERT INTO reference (
				id, reference_type, module, tenant_id, reference_no, active, application_id
			) VALUES ($1, $2, $3, $4, $5, $6, $7)
		`
		_, err := r.db.ExecContext(ctx, refQuery,
			refID,
			ref.ReferenceType,
			ref.Module,
			ref.TenantId,
			ref.ReferenceNo,
			ref.Active,
			appID,
		)
		if err != nil {
			return model.ApplicationResponse{}, err
		}
		req.Application.Reference[i].Id = refID
	}

	// Insert Applicants
	for i, applicant := range req.Application.Applicants {

		applicantID := uuid.New()
		applicantQuery := `
			INSERT INTO applicant (
				id, type, application_id, user_id, name, mobile_number, email_id, prefix, active
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		`
		_, err := r.db.ExecContext(ctx, applicantQuery,
			applicantID,
			applicant.Type,
			appID,
			applicant.UserId,
			applicant.Name,
			applicant.MobileNumber,
			applicant.EmailId,
			applicant.Prefix,
			applicant.Active,
		)
		if err != nil {
			return model.ApplicationResponse{}, err
		}
		req.Application.Applicants[i].Id = applicantID
	}

	nowMillis := time.Now().UnixMilli()

	return model.ApplicationResponse{
		ResponseInfo: model.ResponseInfo{
			ApiId:    req.RequestInfo.ApiId,
			Ver:      req.RequestInfo.Ver,
			UserInfo: *req.RequestInfo.UserInfo,
		},
		Application: model.Application{
			Id:                appID,
			TenantId:          req.Application.TenantId,
			Module:            req.Application.Module,
			BusinessService:   req.Application.BusinessService,
			Status:            req.Application.Status,
			Channel:           req.Application.Channel,
			ApplicationNumber: req.Application.ApplicationNumber,
			WorkflowStatus:    req.Application.WorkflowStatus,
			ServiceCode:       req.Application.ServiceCode,
			ServiceDetails:    req.Application.ServiceDetails,
			AdditionalDetails: req.Application.AdditionalDetails,
			Address:           req.Application.Address,
			Workflow:          req.Application.Workflow,
			Applicants:        req.Application.Applicants,
			Reference:         req.Application.Reference,
			AuditDetails: model.AuditDetails{
				CreatedBy:        createdBy,
				LastModifiedBy:   createdBy,
				CreatedTime:      nowMillis,
				LastModifiedTime: nowMillis,
			},
		},
	}, nil
}

func (r *ApplicationRepository) Search(ctx context.Context, criteria model.SearchCriteria) (model.SearchResponse, error) {
	var queryBuilder strings.Builder
	var args []interface{}
	var conditions []string
	argPos := 1

	// Check if service exists
	searchServiceCriteria := model.SearchCriteria{
		TenantId:    criteria.TenantId,
		ServiceCode: criteria.ServiceCode,
	}
	existingService, _ := r.publicRepo.SearchService(ctx, searchServiceCriteria)
	if len(existingService.Services) == 0 {
		return model.SearchResponse{}, errors.New("Service with given serviceCode not present in the application. Please create the service.")
	}

	queryBuilder.WriteString(`
		SELECT 
			a.id, a.tenant_id, a.module, a.business_service, a.status, a.channel, a.application_number,
			a.workflow_status, a.service_code, a.service_details, a.additional_details, a.address, a.workflow,
			a.createdby, a.last_modifiedby, a.created_at, a.updated_at,
			r.id, r.reference_type, r.module, r.tenant_id, r.reference_no, r.active,
			ap.id, ap.type, ap.user_id, ap.name, ap.mobile_number, ap.email_id, ap.prefix, ap.active
		FROM application a
		LEFT JOIN reference r ON a.id = r.application_id
		LEFT JOIN applicant ap ON a.id = ap.application_id
	`)

	// Dynamic WHERE clause
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
	if len(conditions) > 0 {
		queryBuilder.WriteString(" WHERE ")
		queryBuilder.WriteString(strings.Join(conditions, " AND "))
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

			refId, refType, refModule, refTenantId, refNo sql.NullString
			refActive                                     sql.NullBool

			applicantId, applicantType, applicantUserId, applicantName, applicantMobile, applicantEmail, applicantPrefix sql.NullString
			applicantActive                                                                                              sql.NullBool
		)

		err := rows.Scan(
			&appId,
			&tenantId,
			&module,
			&businessService,
			&status,
			&channel,
			&applicationNumber,
			&workflowStatus,
			&serviceCode,
			&serviceDetailsJSON,
			&additionalDetailsJSON,
			&addressJSON,
			&workflowJSON,
			&createdBy,
			&lastModifiedBy,
			&createdAt,
			&updatedAt,
			&refId,
			&refType,
			&refModule,
			&refTenantId,
			&refNo,
			&refActive,
			&applicantId,
			&applicantType,
			&applicantUserId,
			&applicantName,
			&applicantMobile,
			&applicantEmail,
			&applicantPrefix,
			&applicantActive,
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
					CreatedTime:      time.Now().UnixMilli(),
					LastModifiedTime: time.Now().UnixMilli(),
				},
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
				Name:   applicantName.String,
				MobileNumber: func() int64 {
					if applicantMobile.Valid {
						num, err := strconv.ParseInt(applicantMobile.String, 10, 64)
						if err == nil {
							return num
						}
					}
					return 0
				}(),
				EmailId: applicantEmail.String,
				Prefix:  applicantPrefix.String,
				Active:  applicantActive.Bool,
			}
			app.Applicants = append(app.Applicants, applicant)
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

func (r *ApplicationRepository) Update(ctx context.Context, req model.ApplicationRequest, serviceCode string, applicationId string) (model.ApplicationResponse, error) {
	nowMillis := time.Now().UnixMilli()
	log.Println("Application request", req.Application)
	searchCriteria := model.SearchCriteria{
		TenantId:    req.Application.TenantId,
		ServiceCode: serviceCode,
		Ids:         []string{applicationId},
	}

	existingService, _ := r.Search(ctx, searchCriteria)
	if len(existingService.Application) == 0 {
		return model.ApplicationResponse{}, errors.New("Service with given serviceCode and applicationId not present in the application.")
	}

	if req.RequestInfo.UserInfo == nil {
		req.RequestInfo.UserInfo = &model.User{}
	}

	if req.RequestInfo.UserInfo.Uuid == uuid.Nil {
		req.RequestInfo.UserInfo.Uuid = uuid.New()
	}

	modifiedBy := req.RequestInfo.UserInfo.Uuid
	// Marshal complex fields
	serviceDetailsJSON, _ := json.Marshal(req.Application.ServiceDetails)
	additionalDetailsJSON, _ := json.Marshal(req.Application.AdditionalDetails)
	addressJSON, _ := json.Marshal(req.Application.Address)
	workflowJSON, _ := json.Marshal(req.Application.Workflow)

	appQuery := `
		UPDATE application
		SET tenant_id = $1,
		    module = $2,
		    business_service = $3,
		    status = $4,
		    channel = $5,
		    application_number = $6,
		    workflow_status = $7,
		    service_details = $8,
		    additional_details = $9,
		    address = $10,
		    workflow = $11,
		    last_modifiedby = $12,
		    updated_at = to_timestamp($13 / 1000.0)
		WHERE id = $14
	`
	_, err := r.db.ExecContext(ctx, appQuery,
		req.Application.TenantId,
		req.Application.Module,
		req.Application.BusinessService,
		req.Application.Status,
		req.Application.Channel,
		req.Application.ApplicationNumber,
		req.Application.WorkflowStatus,
		serviceDetailsJSON,
		additionalDetailsJSON,
		addressJSON,
		workflowJSON,
		modifiedBy,
		nowMillis,
		req.Application.Id,
	)
	if err != nil {
		return model.ApplicationResponse{}, fmt.Errorf("failed to update application: %w", err)
	}

	// Update References
	for _, ref := range req.Application.Reference {
		refQuery := `
			UPDATE reference
			SET reference_type = $1,
			    module = $2,
			    tenant_id = $3,
			    reference_no = $4,
			    active = $5
			WHERE id = $6
		`
		_, err := r.db.ExecContext(ctx, refQuery,
			ref.ReferenceType,
			ref.Module,
			ref.TenantId,
			ref.ReferenceNo,
			ref.Active,
			ref.Id,
		)
		if err != nil {
			return model.ApplicationResponse{}, fmt.Errorf("failed to update reference: %w", err)
		}
	}

	// Update Applicants
	for _, applicant := range req.Application.Applicants {
		applicantQuery := `
			UPDATE applicant
			SET type = $1,
			    user_id = $2,
			    name = $3,
			    mobile_number = $4,
			    email_id = $5,
			    prefix = $6,
			    active = $7
			WHERE id = $8
		`
		_, err := r.db.ExecContext(ctx, applicantQuery,
			applicant.Type,
			applicant.UserId,
			applicant.Name,
			applicant.MobileNumber,
			applicant.EmailId,
			applicant.Prefix,
			applicant.Active,
			applicant.Id,
		)
		if err != nil {
			return model.ApplicationResponse{}, fmt.Errorf("failed to update applicant: %w", err)
		}
	}
	req.Application.AuditDetails.LastModifiedBy = modifiedBy
	req.Application.AuditDetails.LastModifiedTime = time.Now().UnixMilli()
	return model.ApplicationResponse{
		ResponseInfo: model.ResponseInfo{
			ApiId:    req.RequestInfo.ApiId,
			Ver:      req.RequestInfo.Ver,
			UserInfo: *req.RequestInfo.UserInfo,
		},
		Application: req.Application,
	}, nil
}

func (r *ApplicationRepository) generateApplicationNumber(ctx context.Context, tenantId, module, businessService string) (applicationNumber string, err error) {
	var nextVal int64

	// Get next value from the sequence
	query := "SELECT nextval('application_number_sequence')"
	err = r.db.QueryRowContext(ctx, query).Scan(&nextVal)
	if err != nil {
		return "", fmt.Errorf("failed to get next sequence value: %w", err)
	}

	// Format application number
	applicationNumber = fmt.Sprintf("APL-%s-%s-%s-%02d", strings.ToUpper(tenantId), strings.ToUpper(module), strings.ToUpper(businessService), nextVal)
	return applicationNumber, nil
}

func (r *ApplicationRepository) SearchWithIndividual(ctx context.Context, criteria model.SearchCriteria) (model.SearchResponse, error) {
	var queryBuilder strings.Builder
	var args []interface{}
	var conditions []string
	argPos := 1

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
			a.createdby, a.last_modifiedby, a.created_at, a.updated_at,
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
	if criteria.UserId != "" {
		conditions = append(conditions, fmt.Sprintf("ap.user_id = $%d", argPos))
		args = append(args, criteria.UserId)
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
			&createdBy, &lastModifiedBy, &createdAt, &updatedAt,
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
			app.Applicants = append(app.Applicants, applicant)
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
		log.Println("Kafka message payload:", string(messageBytes))

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
		log.Println("request", string(kafkaPayload))
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
