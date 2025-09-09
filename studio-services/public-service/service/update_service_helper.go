package service

import (
	"context"
	"fmt"
	"log"
	"public-service/model"
	"public-service/repository"
	"reflect"
	"strings"
)

// ChangeDetails represents the structure of each change in the config comparison
type ChangeDetails struct {
	ChangeType    string      `json:"changeType,omitempty"`
	NewValue      interface{} `json:"newValue"`
	PreviousValue interface{} `json:"previousValue"`
	Type          string      `json:"type"`
}

// ConfigComparisonResult represents the full comparison result
type ConfigComparisonResult struct {
	Changes         map[string]ChangeDetails `json:"changes"`
	CurrentVersion  int                      `json:"currentVersion"`
	HasChanges      bool                     `json:"hasChanges"`
	PreviousVersion int                      `json:"previousVersion"`
}


type UpdateServiceHelper struct {
	repo *repository.PublicRepository
	mdms_service MDMSV2Service
	localizationService *LocalizationService
	checklistService *ChecklistService
	workflowService *WorkflowService
}

func NewUpdateServiceHelper(repo *repository.PublicRepository, mdms_service MDMSV2Service, localizationService *LocalizationService, checklistService *ChecklistService, workflowService *WorkflowService) *UpdateServiceHelper {
	return &UpdateServiceHelper{
		repo: repo,
		mdms_service: mdms_service,
		localizationService: localizationService,
		checklistService: checklistService,
		workflowService: workflowService,
	}
}



// CompareServiceConfigs - Fixed to return ConfigComparisonResult
func (r *UpdateServiceHelper) CompareServiceConfigs(ctx context.Context, serviceCode string, version int, currentConfig map[string]interface{},req model.ServiceRequest) (ConfigComparisonResult, error) {
	// Get previous version config
	previousConfig, err := r.repo.GetServiceVersionConfig(ctx, serviceCode, version)
	if err != nil {
		return ConfigComparisonResult{}, fmt.Errorf("failed to get previous version config: %w", err)
	}

	// Compare configurations and identify changes
	changes := r.identifyConfigChanges(previousConfig, currentConfig, "")

	return ConfigComparisonResult{
		PreviousVersion: version - 1,
		CurrentVersion:  version,
		Changes:         changes,
		HasChanges:      len(changes) > 0,
	}, nil
}

// Helper method to recursively identify changes between configurations
func (r *UpdateServiceHelper) identifyConfigChanges(previous, current map[string]interface{}, path string) map[string]ChangeDetails {
	changes := make(map[string]ChangeDetails)

	// Check for modified and added fields
	for key, currentValue := range current {
		currentPath := key
		if path != "" {
			currentPath = path + "." + key
		}

		previousValue, exists := previous[key]

		if !exists {
			// New field added
			changes[currentPath] = ChangeDetails{
				Type:     "added",
				NewValue: currentValue,
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
				changes[currentPath] = ChangeDetails{
					Type:          "modified",
					PreviousValue: previousValue,
					NewValue:      currentValue,
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
			changes[currentPath] = ChangeDetails{
				Type:          "removed",
				PreviousValue: previousValue,
			}
		}
	}

	return changes
}

// Helper method to compare arrays/slices
func (r *UpdateServiceHelper) compareArrays(previous, current []interface{}, path string) map[string]ChangeDetails {
	changes := make(map[string]ChangeDetails)

	// Simple approach: if arrays are different lengths or content, mark as modified
	if len(previous) != len(current) {
		changes[path] = ChangeDetails{
			Type:          "modified",
			PreviousValue: previous,
			NewValue:      current,
			ChangeType:    "array_length_changed",
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

			changes[elementPath] = ChangeDetails{
				Type:          "modified",
				PreviousValue: previous[i],
				NewValue:      current[i],
			}
		}
	}

	return changes
}

// Helper method to convert interface{} to []interface{} if possible
func (r *UpdateServiceHelper) toInterfaceSlice(v interface{}) ([]interface{}, bool) {
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
func (r *UpdateServiceHelper) deepEqual(a, b interface{}) bool {
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

// Change handler functions

func (r *UpdateServiceHelper) billChanged(ctx context.Context, changeKey string, changeDetails ChangeDetails, serviceCode string, version int, mdmsConfigData map[string]interface{}, req model.ServiceRequest) error {
	log.Printf("Processing bill configuration change for service: %s, version: %d", serviceCode, version)
	log.Printf("Change key: %s", changeKey)
	log.Printf("Change type: %s", changeDetails.Type)


	// Add your bill-specific logic here
	// For example: update billing configurations, notify billing service, etc.

	return nil
}

func (r *UpdateServiceHelper) workflowChanged(ctx context.Context, changeKey string, changeDetails ChangeDetails, serviceCode string, version int, mdmsConfigData map[string]interface{}, req model.ServiceRequest) error {
	log.Printf("Processing workflow configuration change for service: %s, version: %d", serviceCode, version)
	log.Printf("Change key: %s", changeKey)
	log.Printf("Change type: %s", changeDetails.Type)
	workflowData, ok := mdmsConfigData["workflow"].(map[string]interface{})
	if !ok {
		return  fmt.Errorf("no 'workflow' section in MDMS data")
	}

	businessServiceName, ok := workflowData["businessService"].(string)
	if !ok {
		return fmt.Errorf("invalid 'businessService' in workflow data")
	}
	 _,err := r.repo.HandleWorkflowDeletion(ctx, businessServiceName, req)
	 if err != nil {	
		log.Printf("Error handling workflow deletion: %v", err)	
		return fmt.Errorf("failed to handle workflow deletion: %w", err)
	 }
	resp1, _ := r.workflowService.CreateAndValidateBusinessService(req)
	log.Println(resp1)
	// Add your workflow-specific logic here
	// For example: update workflow engine, reconfigure state transitions, etc.

	return nil
}

func (r *UpdateServiceHelper) notificationChanged(ctx context.Context, changeKey string, changeDetails ChangeDetails, serviceCode string, version int, mdmsConfigData map[string]interface{}, serviceRequest model.ServiceRequest) error {
	log.Printf("Processing notification configuration change for service: %s, version: %d", serviceCode, version)
	log.Printf("Change key: %s", changeKey)
	log.Printf("Change type: %s", changeDetails.Type)
    r.localizationService.SMSLocalization(mdmsConfigData,serviceRequest)
	// Add your notification-specific logic here
	// For example: update notification templates, reconfigure email/SMS settings, etc.
	
    
	return nil
}

func (h *UpdateServiceHelper) roleChanged(ctx context.Context, changeKey string, changeDetails ChangeDetails, serviceCode string, version int, mdmsConfigData map[string]interface{}, req model.ServiceRequest) error {
	log.Printf("Processing role configuration change for service: %s, version: %d", serviceCode, version)
	log.Printf("Change key: %s", changeKey)
	log.Printf("Change type: %s", changeDetails.Type)
	getActionIdFromUrl := func(searchUrl string) (string, error) {
		filter := map[string]string{
			"url": searchUrl,
		}

		res, err := h.mdms_service.SearchMDMS(req.Service.TenantId, "ACCESSCONTROL-ACTIONS-TEST.actions-test", filter, req.RequestInfo)
		if err != nil {
			log.Printf("Error calling MDMS search for URL %s: %v", searchUrl, err)
			return "", err
		}

		// Extract action ID from the response
		if mdmsActionList, ok := res["mdms"].([]interface{}); ok && len(mdmsActionList) > 0 {
			if firstActionEntry, ok := mdmsActionList[0].(map[string]interface{}); ok {
				if actionData, ok := firstActionEntry["data"].(map[string]interface{}); ok {
					if actionIdFloat, ok := actionData["id"].(float64); ok {
						return fmt.Sprintf("%.0f", actionIdFloat), nil
					} else if actionIdInt, ok := actionData["id"].(int); ok {
						return fmt.Sprintf("%d", actionIdInt), nil
					}
				}
			}
		}

		return "", fmt.Errorf("could not extract action ID for URL: %s", searchUrl)
	}
	additionalActionId, err := getActionIdFromUrl("/public-service/v1/application/}"+req.Service.ServiceCode)
	if err != nil {
		log.Printf("Error fetching additional action ID: %v", err)
	} else {
		log.Printf("Fetched additional action ID: %s", additionalActionId)
		h.mdms_service.createMDMSRoleActionMapping(req.Service.TenantId,additionalActionId,req)
	}
	return nil
}
func (r *UpdateServiceHelper) checklistChanged(ctx context.Context, changeKey string, changeDetails ChangeDetails, serviceCode string, version int, mdmsConfigData map[string]interface{}, req model.ServiceRequest) error {
	log.Printf("Processing checklist configuration change for service: %s, version: %d", serviceCode, version)
	log.Printf("Change key: %s", changeKey)
	log.Printf("Change type: %s", changeDetails.Type)
    r.checklistService.GetChecklist(req.Service.TenantId, req.Service.Module, req.Service.BusinessService, req.RequestInfo)
	// Add your checklist-specific logic here
	// For example: update validation rules, refresh checklist items, etc.

	return nil
}

func (r *UpdateServiceHelper) idgenChanged(ctx context.Context, changeKey string, changeDetails ChangeDetails, serviceCode string, version int, mdmsConfigData map[string]interface{}, req model.ServiceRequest) error {
	log.Printf("Processing ID generation configuration change for service: %s, version: %d", serviceCode, version)
	log.Printf("Change key: %s", changeKey)
	log.Printf("Change type: %s", changeDetails.Type)
	
	idgenList, ok := mdmsConfigData["idgen"].([]interface{})
	if !ok || len(idgenList) == 0 {
		log.Println("No idgen configuration found in MDMS data")
		return nil
	}
	
	for _, item := range idgenList {
		idgenMap, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		
		if code, ok := idgenMap["idname"].(string); ok && code == serviceCode {
			filter := map[string]string{
				"idname": code,
			}
			
			mdmsData, err := r.mdms_service.SearchMDMS(req.Service.TenantId, "common-masters.IdFormat", filter, req.RequestInfo)
			if err != nil {
				log.Printf("Error searching MDMS data: %v", err)
				return err
			}
			
			if mdmsData != nil {
				log.Printf("Fetched MDMS data for service code %s: %v", serviceCode, mdmsData)
				
				// Extract the first result from mdmsData and update its data section
				if mdmsArray, ok := mdmsData["mdms"].([]interface{}); ok && len(mdmsArray) > 0 {
					if firstResult, ok := mdmsArray[0].(map[string]interface{}); ok {
						// Update the data section with values from mdmsConfigData
						if data, ok := firstResult["data"].(map[string]interface{}); ok {
							// Update with values from mdmsConfigData
							data["type"] = idgenMap["type"]
							data["format"] = idgenMap["format"] 
							data["idname"] = idgenMap["idname"]
							
							log.Printf("Updated data section: %v", data)
						}
						
						log.Printf("Complete update payload: %v", firstResult)
						
						// Call UpdateMDMS function with the complete updated record
						err := r.mdms_service.UpdateMDMS(req.Service.TenantId, "common-masters.IdFormat", firstResult, req.RequestInfo)
						if err != nil {
							log.Printf("Error updating MDMS data: %v", err)
							return err
						}
						
						log.Printf("Successfully updated MDMS data for service code: %s", serviceCode)
					}
				}
			} else {
				log.Printf("No MDMS data found for service code: %s", serviceCode)
			}
			break
		}
	}
	
	return nil
}

func (r *UpdateServiceHelper) documentChanged(ctx context.Context, changeKey string, changeDetails ChangeDetails, serviceCode string, version int, mdmsConfigData map[string]interface{}, req model.ServiceRequest) error {
	log.Printf("Processing document configuration change for service: %s, version: %d", serviceCode, version)
	log.Printf("Change key: %s", changeKey)
	log.Printf("Change type: %s", changeDetails.Type)

	// Add your document-specific logic here
	// For example: update document requirements, refresh document templates, etc.

	return nil
}

func (r *UpdateServiceHelper) formChanged(ctx context.Context, changeKey string, changeDetails ChangeDetails, serviceCode string, version int, mdmsConfigData map[string]interface{}, req model.ServiceRequest) error {
	log.Printf("Processing form configuration change for service: %s, version: %d", serviceCode, version)
	log.Printf("Change key: %s", changeKey)
	log.Printf("Change type: %s", changeDetails.Type)
	r.localizationService.BasicLocalization(mdmsConfigData, req)

	// Add your form-specific logic here
	// For example: update form schemas, refresh validation rules, etc.

	return nil
}

// Main function to process all configuration changes
func (r *UpdateServiceHelper) ProcessConfigurationChanges(ctx context.Context, comparisonResult ConfigComparisonResult, serviceCode string,mdmsConfigData map[string]interface{}, req model.ServiceRequest) error {
	if !comparisonResult.HasChanges {
		log.Printf("No configuration changes detected for service: %s", serviceCode)
		return nil
	}

	log.Printf("Processing %d configuration changes for service: %s (version %d -> %d)",
		len(comparisonResult.Changes), serviceCode, comparisonResult.PreviousVersion, comparisonResult.CurrentVersion)

	var errors []error

	for changeKey, changeDetails := range comparisonResult.Changes {
		err := r.processIndividualChange(ctx, changeKey, changeDetails, serviceCode, comparisonResult.CurrentVersion, mdmsConfigData, req)
		if err != nil {
			log.Printf("Error processing change %s: %v", changeKey, err)
			errors = append(errors, err)
		}
	}

	if len(errors) > 0 {
		return fmt.Errorf("encountered %d errors while processing configuration changes", len(errors))
	}

	log.Printf("Successfully processed all configuration changes for service: %s", serviceCode)
	return nil
}

// processIndividualChange routes each change to the appropriate handler based on the change key prefix
func (r *UpdateServiceHelper) processIndividualChange(ctx context.Context, changeKey string, changeDetails ChangeDetails, serviceCode string, version int, mdmsConfigData map[string]interface{}, req model.ServiceRequest) error {
	// Determine the configuration type based on the change key prefix
	configType := r.getConfigurationType(changeKey)

	log.Printf("Processing change for config type: %s, key: %s", configType, changeKey)

	switch configType {
	case "bill":
		return r.billChanged(ctx, changeKey, changeDetails, serviceCode, version, mdmsConfigData, req)
	case "workflow":
		return r.workflowChanged(ctx, changeKey, changeDetails, serviceCode, version, mdmsConfigData, req)
	case "notification":
		return r.notificationChanged(ctx, changeKey, changeDetails, serviceCode, version, mdmsConfigData, req)
	case "role":
		return r.roleChanged(ctx, changeKey, changeDetails, serviceCode, version, mdmsConfigData, req)
	case "checklist":
		return r.checklistChanged(ctx, changeKey, changeDetails, serviceCode, version, mdmsConfigData, req)
	case "idgen":
		return r.idgenChanged(ctx, changeKey, changeDetails, serviceCode, version, mdmsConfigData, req)
	case "document":
		return r.documentChanged(ctx, changeKey, changeDetails, serviceCode, version, mdmsConfigData, req)
	case "form":
		return r.formChanged(ctx, changeKey, changeDetails, serviceCode, version, mdmsConfigData, req)
	default:
		log.Printf("No specific handler found for configuration type: %s, using generic handler", configType)
		return r.handleGenericChange(ctx, changeKey, changeDetails, serviceCode, version, mdmsConfigData, req)
	}
}

// getConfigurationType extracts the configuration type from the change key
func (r *UpdateServiceHelper) getConfigurationType(changeKey string) string {
	// Split the key by dots and take the first part
	parts := strings.Split(changeKey, ".")
	if len(parts) > 0 {
		return parts[0]
	}
	return "unknown"
}

// handleGenericChange handles configuration changes that don't have specific handlers
func (r *UpdateServiceHelper) handleGenericChange(ctx context.Context, changeKey string, changeDetails ChangeDetails, serviceCode string, version int, mdmsConfigData map[string]interface{}, req model.ServiceRequest) error {
	log.Printf("Processing generic configuration change for service: %s, version: %d", serviceCode, version)
	log.Printf("Change key: %s", changeKey)
	log.Printf("Change type: %s", changeDetails.Type)

	// Add generic change handling logic here
	// This could include logging, auditing, or default processing steps

	return nil
}