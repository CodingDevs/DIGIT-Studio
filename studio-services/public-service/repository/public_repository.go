package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"public-service/config"
	producer "public-service/kafka/producer"
	"public-service/model"
	"strings"
	"time"
	"github.com/google/uuid"
	"github.com/lib/pq"
)

type PublicRepository struct {
	db *sql.DB
	kafkaProducer *producer.PublicServiceProducer
}

func NewPublicRepository(db *sql.DB, kafkaProducer *producer.PublicServiceProducer) *PublicRepository {
	return &PublicRepository{db: db,kafkaProducer: kafkaProducer}
}
func (r PublicRepository) CreateService(ctx context.Context, req model.ServiceRequest, tenantId string, mdmsConfigData map[string]interface{}) (model.ServiceResponse, error) {
	searchCriteria := model.SearchCriteria{
		TenantId:        tenantId,
		Module:          req.Service.Module,
		BusinessService: req.Service.BusinessService,
	}

	existingService, _ := r.SearchService(ctx, searchCriteria)
	if len(existingService.Services) > 0 {
		return model.ServiceResponse{}, errors.New("Service already exists with same module,business service and tenantId")
	}

	now := time.Now()
	if req.RequestInfo.UserInfo == nil {
		req.RequestInfo.UserInfo = &model.User{}
	}

	if req.RequestInfo.UserInfo.Uuid == uuid.Nil {
		req.RequestInfo.UserInfo.Uuid = uuid.New()
	}

	createdBy := req.RequestInfo.UserInfo.Uuid

	ServiceID := uuid.New()

	req.Service.ID = ServiceID
	req.Service.AuditDetails = model.AuditDetails{
		CreatedBy:        createdBy,
		LastModifiedBy:   createdBy,
		CreatedTime:      now.UnixMilli(),
		LastModifiedTime: now.UnixMilli(),
	}
	req.Service.Version = 1

	// Marshal request into JSON
	kafkaPayload, err := json.Marshal(req)
	if err != nil {
		return model.ServiceResponse{}, fmt.Errorf("failed to marshal Service request for Kafka: %w", err)
	}

	// Publish to Kafka topic
	if r.kafkaProducer != nil {
		err = r.kafkaProducer.Push(ctx, config.GetEnv("SAVE_PUBLIC_SERVICE"), kafkaPayload)
		if err != nil {
			log.Printf("failed to push kafka message: %v", err)
			return model.ServiceResponse{}, err
		}
	} else {
		return model.ServiceResponse{}, errors.New("Kafka producer is not initialized")
	}
	type ServiceVersionConfigMapping struct {
		ID           uuid.UUID              `json:"id"`
		ServiceCode  string                 `json:"serviceCode"`
		Version      int                    `json:"version"`
		Config       map[string]interface{} `json:"config"`
		AuditDetails model.AuditDetails     `json:"auditDetails"`
   }
	
	ServiceVersionConfigMappingData := ServiceVersionConfigMapping{
		ID:              uuid.New(),
		ServiceCode:     req.Service.ServiceCode,
		Version:         req.Service.Version,
		Config:          mdmsConfigData,
		AuditDetails:    model.AuditDetails{
			CreatedBy:        createdBy,
			LastModifiedBy:   createdBy,
			CreatedTime:      now.UnixMilli(),
			LastModifiedTime: now.UnixMilli(),
		},
	}
	
    kafkaPayload2, err := json.Marshal(ServiceVersionConfigMappingData)
	if err != nil {
		return model.ServiceResponse{}, fmt.Errorf("failed to  marshal ServiceVersionConfigMapping request for  for Kafka: %w", err)
	}

	if r.kafkaProducer != nil {
		err = r.kafkaProducer.Push(ctx, config.GetEnv("SAVE_SERVICE_VERSION_CONFIG_MAPPING"), kafkaPayload2)
		if err != nil {
			log.Printf("failed to push kafka message: %v", err)
			return model.ServiceResponse{}, err
		}
	} else {
		return model.ServiceResponse{}, errors.New("Kafka producer is not initialized")
	}

	nowMillis := time.Now().UnixMilli()
	return model.ServiceResponse{
		ResponseInfo: model.ResponseInfo{
			ApiId:  req.RequestInfo.ApiId,
			Ver:    req.RequestInfo.Ver,
			Status: "SUCCESSFUL",
		},
		Services: []model.Service{ // <-- wrap it in a slice
			{
				ID:                ServiceID,
				TenantId:          req.Service.TenantId,
				Module:            req.Service.Module,
				BusinessService:   req.Service.BusinessService,
				Status:            req.Service.Status,
				ServiceCode:       req.Service.ServiceCode,
				AdditionalDetails: req.Service.AdditionalDetails,
				Version:           req.Service.Version,
				AuditDetails: model.AuditDetails{
					CreatedBy:        createdBy,
					LastModifiedBy:   createdBy,
					CreatedTime:      nowMillis,
					LastModifiedTime: nowMillis,
				},
			},
		},
	}, nil

}

func (r PublicRepository) SearchService(ctx context.Context, criteria model.SearchCriteria) (model.ServiceResponse, error) {
	var queryBuilder strings.Builder
	var args []interface{}
	var conditions []string
	argPos := 1

	queryBuilder.WriteString(`
		SELECT 
			id, tenant_id, module, business_service, status, service_code, additional_details,
			createdby, last_modifiedby, created_at, updated_at, version
		FROM service
	`)

	// Dynamic where clauses
	if criteria.TenantId != "" {
		conditions = append(conditions, fmt.Sprintf("tenant_id = $%d", argPos))
		args = append(args, criteria.TenantId)
		argPos++
	}
	if len(criteria.Ids) > 0 {
		conditions = append(conditions, fmt.Sprintf("id = ANY($%d)", argPos))
		args = append(args, pq.Array(criteria.Ids))
		argPos++
	}
	if criteria.Module != "" {
		conditions = append(conditions, fmt.Sprintf("module = $%d", argPos))
		args = append(args, criteria.Module)
		argPos++
	}
	if criteria.BusinessService != "" {
		conditions = append(conditions, fmt.Sprintf("business_service = $%d", argPos))
		args = append(args, criteria.BusinessService)
		argPos++
	}
	if criteria.ServiceCode != "" {
		conditions = append(conditions, fmt.Sprintf("service_code = $%d", argPos))
		args = append(args, criteria.ServiceCode) // ✅ Fixed here
		argPos++
	}
	if criteria.Status != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argPos))
		args = append(args, criteria.Status)
		argPos++
	}

	if len(conditions) > 0 {
		queryBuilder.WriteString(" WHERE ")
		queryBuilder.WriteString(strings.Join(conditions, " AND "))
	}

	log.Println("query:", queryBuilder.String())

	rows, err := r.db.QueryContext(ctx, queryBuilder.String(), args...)
	if err != nil {
		return model.ServiceResponse{}, err
	}
	defer rows.Close()

	var services []model.Service
	serviceMap := make(map[uuid.UUID]*model.Service)

	for rows.Next() {
		var (
			id                                                     uuid.UUID
			tenantId, module, businessService, status, serviceCode string
			additionalDetailsJSON                                  []byte
			createdBy, lastModifiedBy                              uuid.UUID
			createdAt, updatedAt                                   time.Time
			version                                                int
		)

		err := rows.Scan(
			&id,
			&tenantId,
			&module,
			&businessService,
			&status,
			&serviceCode,
			&additionalDetailsJSON,
			&createdBy,
			&lastModifiedBy,
			&createdAt,
			&updatedAt,
			&version,
		)
		if err != nil {
			return model.ServiceResponse{}, err
		}

		service := &model.Service{
			ID:              id,
			TenantId:        tenantId,
			Module:          module,
			BusinessService: businessService,
			Status:          model.Status(status),
			ServiceCode:     serviceCode,
			AuditDetails: model.AuditDetails{
				CreatedBy:        createdBy,
				LastModifiedBy:   lastModifiedBy,
				CreatedTime:      createdAt.UnixMilli(),
				LastModifiedTime: updatedAt.UnixMilli(),
			},
			Version: version,
		}

		// Unmarshal JSON fields
		_ = json.Unmarshal(additionalDetailsJSON, &service.AdditionalDetails)

		serviceMap[id] = service
	}

	// Collect services from map
	for _, service := range serviceMap {
		services = append(services, *service)
	}

	return model.ServiceResponse{
		Services: services,
		ResponseInfo: model.ResponseInfo{
			Status: "successful",
		},
	}, nil
}


func (r *PublicRepository) UpdateService(ctx context.Context, req model.ServiceRequest, serviceCode string, mdmsConfigData map[string]interface{}) (model.ServiceResponse, error) {
	searchCriteria := model.SearchCriteria{
		TenantId:    req.Service.TenantId,
		ServiceCode: serviceCode,
	}

	existingService, _ := r.SearchService(ctx, searchCriteria)
	if len(existingService.Services) == 0 {
		return model.ServiceResponse{}, errors.New("No Service Found with given ServiceCode")
	}
	nowMillis := time.Now().UnixMilli()
	// Marshal complex fields
	// additionalDetailsJSON, _ := json.Marshal(req.Service.AdditionalDetails)
	if req.RequestInfo.UserInfo == nil {
		req.RequestInfo.UserInfo = &model.User{}
	}

	if req.RequestInfo.UserInfo.Uuid == uuid.Nil {
		req.RequestInfo.UserInfo.Uuid = uuid.New()
	}

	modifiedBy := req.RequestInfo.UserInfo.Uuid
	req.Service.AuditDetails = model.AuditDetails{
		LastModifiedBy:   modifiedBy,
		LastModifiedTime: nowMillis,
	}
	
	req.Service.Version = existingService.Services[0].Version + 1
	// Marshal request into JSON
	kafkaPayload, err := json.Marshal(req)
	if err != nil {
		return model.ServiceResponse{}, fmt.Errorf("failed to marshal application request for Kafka: %w", err)
	}

	// Publish to Kafka topic
	if r.kafkaProducer != nil {
		log.Println("request", string(kafkaPayload))
		err = r.kafkaProducer.Push(ctx, config.GetEnv("UPDATE_PUBLIC_SERVICE"), kafkaPayload)
		if err != nil {
			log.Printf("failed to push kafka message: %v", err)
			return model.ServiceResponse{}, err
		}
	} else {
		return model.ServiceResponse{}, errors.New("Kafka producer is not initialized")
	}
	type ServiceVersionConfigMapping struct {
		ID           uuid.UUID              `json:"id"`
		ServiceCode  string                 `json:"serviceCode"`
		Version      int                    `json:"version"`
		Config       map[string]interface{} `json:"config"`
		AuditDetails model.AuditDetails     `json:"auditDetails"`
   }
	now := time.Now()
	ServiceVersionConfigMappingData := ServiceVersionConfigMapping{
		ID:              uuid.New(),
		ServiceCode:     req.Service.ServiceCode,
		Version:         req.Service.Version,
		Config:          mdmsConfigData,
		AuditDetails:    model.AuditDetails{
	
			CreatedTime:      now.UnixMilli(),
			LastModifiedTime: now.UnixMilli(),
		},
	}
	
    kafkaPayload2, err := json.Marshal(ServiceVersionConfigMappingData)
	if err != nil {
		return model.ServiceResponse{}, fmt.Errorf("failed to  marshal ServiceVersionConfigMapping request for  for Kafka: %w", err)
	}

	if r.kafkaProducer != nil {
		err = r.kafkaProducer.Push(ctx, config.GetEnv("SAVE_SERVICE_VERSION_CONFIG_MAPPING"), kafkaPayload2)
		if err != nil {
			log.Printf("failed to push kafka message: %v", err)
			return model.ServiceResponse{}, err
		}
	} else {
		return model.ServiceResponse{}, errors.New("Kafka producer is not initialized")
	}
	return model.ServiceResponse{
		ResponseInfo: model.ResponseInfo{
			ApiId: req.RequestInfo.ApiId,
			Ver:   req.RequestInfo.Ver,
		},
		Services: []model.Service{req.Service},
	}, nil
}
