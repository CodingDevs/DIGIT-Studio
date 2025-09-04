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
	"reflect"
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
	r.CompareServiceConfigs(ctx, serviceCode, req.Service.Version, mdmsConfigData)
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

func (r *PublicRepository) GetServiceVersionConfig(ctx context.Context, serviceCode string, version int) (map[string]interface{}, error) {
	// Calculate the previous version
	previousVersion := version - 1
	
	// If previous version is less than 1, return empty config
	if previousVersion < 1 {
		return map[string]interface{}{}, nil
	}

	query := `
		SELECT config 
		FROM service_version_config_mapping 
		WHERE service_code = $1 AND version = $2
	`
	
	var configJSON []byte
	err := r.db.QueryRowContext(ctx, query, serviceCode, previousVersion).Scan(&configJSON)
	if err != nil {
		if err == sql.ErrNoRows {
			// No config found for the previous version, return empty map
			return map[string]interface{}{}, nil
		}
		return nil, fmt.Errorf("failed to get service version config: %w", err)
	}

	// Parse JSONB to map
	var config map[string]interface{}
	if len(configJSON) > 0 {
		err = json.Unmarshal(configJSON, &config)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal config JSON: %w", err)
		}
	}

	if config == nil {
		config = map[string]interface{}{}
	}

	return config, nil
}

// Add this method to the PublicRepository struct
func (r *PublicRepository) CompareServiceConfigs(ctx context.Context, serviceCode string, version int, currentConfig map[string]interface{}) (map[string]interface{}, error) {
	// Get previous version config
	previousConfig, err := r.GetServiceVersionConfig(ctx, serviceCode, version)
	if err != nil {
		return nil, fmt.Errorf("failed to get previous version config: %w", err)
	}

	// Compare configurations and identify changes
	changes := r.identifyConfigChanges(previousConfig, currentConfig, "")
	
	return map[string]interface{}{
		"previousVersion": version - 1,
		"currentVersion":  version,
		"changes":         changes,
		"hasChanges":      len(changes) > 0,
	}, nil
}

// Helper method to recursively identify changes between configurations
func (r *PublicRepository) identifyConfigChanges(previous, current map[string]interface{}, path string) map[string]interface{} {
	changes := make(map[string]interface{})
	
	// Check for modified and added fields
	for key, currentValue := range current {
		currentPath := key
		if path != "" {
			currentPath = path + "." + key
		}
		
		previousValue, exists := previous[key]
		
		if !exists {
			// New field added
			changes[currentPath] = map[string]interface{}{
				"type":     "added",
				"newValue": currentValue,
			}
		} else {
			// Check if values are different
			if !r.deepEqual(previousValue, currentValue) {
				// Handle nested objects
				if prevMap, isPrevMap := previousValue.(map[string]interface{}); isPrevMap {
					if currMap, isCurrMap := currentValue.(map[string]interface{}); isCurrMap {
						nestedChanges := r.identifyConfigChanges(prevMap, currMap, currentPath)
						for nestedPath, nestedChange := range nestedChanges {
							changes[nestedPath] = nestedChange
						}
						continue
					}
				}
				
				// Handle arrays/slices
				if prevArray, isPrevArray := r.toInterfaceSlice(previousValue); isPrevArray {
					if currArray, isCurrArray := r.toInterfaceSlice(currentValue); isCurrArray {
						arrayChanges := r.compareArrays(prevArray, currArray, currentPath)
						for arrayPath, arrayChange := range arrayChanges {
							changes[arrayPath] = arrayChange
						}
						continue
					}
				}
				
				// Simple value change
				changes[currentPath] = map[string]interface{}{
					"type":         "modified",
					"previousValue": previousValue,
					"newValue":     currentValue,
				}
			}
		}
	}
	
	// Check for removed fields
	for key, previousValue := range previous {
		currentPath := key
		if path != "" {
			currentPath = path + "." + key
		}
		
		if _, exists := current[key]; !exists {
			changes[currentPath] = map[string]interface{}{
				"type":          "removed",
				"previousValue": previousValue,
			}
		}
	}
	
	return changes
}

// Helper method to compare arrays/slices
func (r *PublicRepository) compareArrays(previous, current []interface{}, path string) map[string]interface{} {
	changes := make(map[string]interface{})
	
	// Simple approach: if arrays are different lengths or content, mark as modified
	if len(previous) != len(current) {
		changes[path] = map[string]interface{}{
			"type":         "modified",
			"previousValue": previous,
			"newValue":     current,
			"changeType":   "array_length_changed",
		}
		return changes
	}
	
	// Compare each element
	for i := 0; i < len(current); i++ {
		elementPath := fmt.Sprintf("%s[%d]", path, i)
		
		if !r.deepEqual(previous[i], current[i]) {
			// Handle nested objects in arrays
			if prevMap, isPrevMap := previous[i].(map[string]interface{}); isPrevMap {
				if currMap, isCurrMap := current[i].(map[string]interface{}); isCurrMap {
					nestedChanges := r.identifyConfigChanges(prevMap, currMap, elementPath)
					for nestedPath, nestedChange := range nestedChanges {
						changes[nestedPath] = nestedChange
					}
					continue
				}
			}
			
			changes[elementPath] = map[string]interface{}{
				"type":         "modified",
				"previousValue": previous[i],
				"newValue":     current[i],
			}
		}
	}
	
	return changes
}

// Helper method to convert interface{} to []interface{} if possible
func (r *PublicRepository) toInterfaceSlice(v interface{}) ([]interface{}, bool) {
	switch arr := v.(type) {
	case []interface{}:
		return arr, true
	case []map[string]interface{}:
		result := make([]interface{}, len(arr))
		for i, item := range arr {
			result[i] = item
		}
		return result, true
	case []string:
		result := make([]interface{}, len(arr))
		for i, item := range arr {
			result[i] = item
		}
		return result, true
	case []int:
		result := make([]interface{}, len(arr))
		for i, item := range arr {
			result[i] = item
		}
		return result, true
	default:
		// Try reflection for other slice types
		val := reflect.ValueOf(v)
		if val.Kind() == reflect.Slice {
			result := make([]interface{}, val.Len())
			for i := 0; i < val.Len(); i++ {
				result[i] = val.Index(i).Interface()
			}
			return result, true
		}
		return nil, false
	}
}

// Helper method for deep equality comparison
func (r *PublicRepository) deepEqual(a, b interface{}) bool {
	// Handle nil cases
	if a == nil && b == nil {
		return true
	}
	if a == nil || b == nil {
		return false
	}
	
	// Use reflection for deep comparison
	return reflect.DeepEqual(a, b)
}