package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"public-service/model"
	"strconv"
	"strings"
)

type ChecklistService struct {
	HttpClient    *http.Client
	MDMSV2Service *MDMSV2Service
	BaseURL       string
}

func NewChecklistService(MdmsV2sService *MDMSV2Service) *ChecklistService {
	return &ChecklistService{
		HttpClient:    &http.Client{},
		MDMSV2Service: MdmsV2sService,
	}
}

func (cs *ChecklistService) GetChecklist(tenantId, moduleName, businessService string, requestInfo model.RequestInfo) (map[string]interface{}, error) {
	schemaCode := os.Getenv("SERVICE_MODULE_NAME") + "." + os.Getenv("SERVICE_MASTER_NAME")
	filters := map[string]string{
		"service": businessService,
		"module":  moduleName,
	}
	log.Printf("Fetching checklist for tenant: %s, module: %s, businessService: %s", tenantId, moduleName, businessService)

	// FIRST MDMS CALL - Get main service configuration
	mdmsData, err := cs.MDMSV2Service.SearchMDMS(tenantId, schemaCode, filters, requestInfo)
	if err != nil {
		return nil, err
	}
	log.Println("MDMS Data", mdmsData)

	mdmsList, ok := mdmsData["mdms"].([]interface{})
	if !ok || len(mdmsList) == 0 {
		return nil, nil
	}

	firstEntry, ok := mdmsList[0].(map[string]interface{})
	if !ok {
		return nil, nil
	}

	dataMap, ok := firstEntry["data"].(map[string]interface{})
	if !ok {
		return nil, nil
	}

	// Extract checklist array from first response
	checklistData, ok := dataMap["checklist"].([]interface{})
	if !ok || len(checklistData) == 0 {
		return nil, nil
	}
	log.Printf("Checklist Data: %v", checklistData)

	results := make(map[string]interface{})

	// SECOND MDMS CALL - Get UI checklist data
	subFilters := map[string]string{
		"module":  moduleName,
		"service": businessService,
	}
	log.Printf("Fetching sub checklist data for tenant: %s, module: %s, businessService: %s", tenantId, moduleName, businessService)

	serviceConfigDraftData, err := cs.MDMSV2Service.SearchMDMS(tenantId, "Studio.ServiceConfigurationDrafts", subFilters, requestInfo)
	if err != nil {
		return nil, err
	}

	mdmsDataDraft, ok := serviceConfigDraftData["mdms"].([]interface{})
	if !ok || len(mdmsDataDraft) == 0 {
		log.Printf("No sub checklist data found")
		return results, nil
	}

	firstEntryDraft, ok := mdmsDataDraft[0].(map[string]interface{})
	if !ok {
		log.Printf("Invalid sub checklist data format")
		return results, nil
	}

	dataMapDraft, ok := firstEntryDraft["data"].(map[string]interface{})
	if !ok {
		log.Printf("No 'data' section in sub checklist data")
		return results, nil
	}

	// Extract uichecklists from second response
	uichecklists, ok := dataMapDraft["uichecklists"].([]interface{})
	if !ok || len(uichecklists) == 0 {
		log.Printf("No 'uichecklists' section in sub checklist data")
		return results, nil
	}

	// PROCESS EACH CHECKLIST ITEM
	for _, item := range checklistData {
		itemMap, ok := item.(map[string]interface{})
		if !ok {
			continue
		}

		name, _ := itemMap["name"].(string)
		name = strings.TrimSpace(name) // Trim the name from checklist data
		if name == "" {
			continue
		}

		state, _ := itemMap["state"].(string)
		state = strings.TrimSpace(state) // Also trim state
		if state == "" {
			continue
		}

		log.Printf("Looking for checklist name: '%s' with state: '%s'", name, state)

		// Find matching checklist in uichecklists
		for _, uiChecklistInterface := range uichecklists {
			uiChecklist, ok := uiChecklistInterface.(map[string]interface{})
			if !ok {
				continue
			}

			checklistName, _ := uiChecklist["name"].(string)
			checklistName = strings.TrimSpace(checklistName)
			if checklistName == "" {
				continue
			}

			log.Printf("Comparing checklist names: '%s' == '%s'", name, checklistName)

			// Only process if the names match
			if name == checklistName {
				log.Printf("Processing checklist: %s for state: %s", checklistName, state)

				// checklistCode = businessService.STATE.CHECKLIST_NAME
				checklistCode := fmt.Sprintf("%s.%s.%s", businessService, state, checklistName)

				// Check if exists
				exists, err := cs.CheckIfChecklistExists(tenantId, checklistCode, requestInfo)
				if err != nil {
					return nil, err
				}

				if exists {
					err = cs.UpdateChecklist(tenantId, checklistCode, uiChecklist, requestInfo)
				} else {
					err = cs.CreateChecklist(tenantId, checklistCode, uiChecklist, requestInfo)
				}

				if err != nil {
					return nil, err
				}

				results[checklistCode] = uiChecklist
				break // Found matching checklist, move to next item
			}
		}
	}

	return results, nil
}

func (cs *ChecklistService) CreateChecklist(tenantId, checklistCode string, uiChecklist map[string]interface{}, requestInfo model.RequestInfo) error {
	createPayload := cs.buildServiceDefinitionPayload(tenantId, checklistCode, uiChecklist, requestInfo)

	// LOG THE CREATE REQUEST BODY
	log.Printf("=== CREATE CHECKLIST REQUEST BODY ===")
	logJSON("Create Checklist Payload:", createPayload)

	_, err := cs.callAPI("POST", os.Getenv("SERVICE_REQUEST_HOST")+os.Getenv("SERVICE_REQUEST_CREATE_ENDPOINT"), createPayload)
	return err
}

func (cs *ChecklistService) UpdateChecklist(tenantId, checklistCode string, uiChecklist map[string]interface{}, requestInfo model.RequestInfo) error {
	updatePayload := cs.buildServiceDefinitionPayload(tenantId, checklistCode, uiChecklist, requestInfo)

	// LOG THE UPDATE REQUEST BODY
	log.Printf("=== UPDATE CHECKLIST REQUEST BODY ===")
	logJSON("Update Checklist Payload:", updatePayload)

	_, err := cs.callAPI("POST", os.Getenv("SERVICE_REQUEST_HOST")+os.Getenv("SERVICE_REQUEST_UPDATE_ENDPOINT"), updatePayload)
	return err
}

func (cs *ChecklistService) CheckIfChecklistExists(tenantId, checklistCode string, requestInfo model.RequestInfo) (bool, error) {
	searchPayload := map[string]interface{}{
		"RequestInfo": requestInfo,
		"ServiceDefinitionCriteria": map[string]interface{}{
			"tenantId": tenantId,
			"code":     []string{checklistCode},
		},
	}

	// LOG THE SEARCH REQUEST BODY
	log.Printf("=== SEARCH CHECKLIST REQUEST BODY ===")
	log.Printf("Search Checklist Payload: %+v", searchPayload)
	logJSON("Search Checklist Payload JSON:", searchPayload)

	resp, err := cs.callAPI("POST", os.Getenv("SERVICE_REQUEST_HOST")+os.Getenv("SERVICE_REQUEST_SEARCH_ENDPOINT"), searchPayload)
	if err != nil {
		return false, err
	}

	serviceDefs, ok := resp["ServiceDefinitions"].([]interface{})
	log.Printf("=== SEARCH RESPONSE ===")
	logJSON("Service Definitions Response", serviceDefs)
	return ok && len(serviceDefs) > 0, nil
}

// buildServiceDefinitionPayload transforms UI checklist data to service definition format
func (cs *ChecklistService) buildServiceDefinitionPayload(tenantId, checklistCode string, uiChecklist map[string]interface{}, requestInfo model.RequestInfo) map[string]interface{} {
	// Extract checklist questions from the UI checklist data
	var attributes []map[string]interface{}

	log.Printf("=== BUILDING SERVICE DEFINITION PAYLOAD ===")
	log.Printf("TenantId: %s, ChecklistCode: %s", tenantId, checklistCode)
	logJSON("UI Checklist Data", uiChecklist)

	// Extract questions from uiChecklist["data"]
	if dataInterface, ok := uiChecklist["data"]; ok {
		if questionsArray, ok := dataInterface.([]interface{}); ok {
			log.Printf("Processing %d questions from UI checklist", len(questionsArray))

			for i, questionInterface := range questionsArray {
				if questionMap, ok := questionInterface.(map[string]interface{}); ok {
					log.Printf("Processing question %d: %+v", i+1, questionMap)

					// Process main question
					if attribute := cs.transformQuestionToAttribute(tenantId, questionMap); attribute != nil {
						attributes = append(attributes, attribute)
						log.Printf("Added main attribute: %+v", attribute)
					}

					// Process subQuestions if any (for nested questions)
					if subQuestionsInterface, ok := questionMap["subQuestions"]; ok {
						if subQuestionsArray, ok := subQuestionsInterface.([]interface{}); ok {
							log.Printf("Processing %d sub-questions", len(subQuestionsArray))
							for j, subQuestionInterface := range subQuestionsArray {
								if subQuestionMap, ok := subQuestionInterface.(map[string]interface{}); ok {
									log.Printf("Processing sub-question %d: %+v", j+1, subQuestionMap)
									if subAttribute := cs.transformQuestionToAttribute(tenantId, subQuestionMap); subAttribute != nil {
										attributes = append(attributes, subAttribute)
										log.Printf("Added sub-attribute: %+v", subAttribute)
									}
								}
							}
						}
					}

					// Also check options for subQuestions (nested in options)
					if optionsInterface, ok := questionMap["options"]; ok {
						if optionsArray, ok := optionsInterface.([]interface{}); ok {
							for k, optionInterface := range optionsArray {
								if optionMap, ok := optionInterface.(map[string]interface{}); ok {
									if optionSubQuestionsInterface, ok := optionMap["subQuestions"]; ok {
										if optionSubQuestionsArray, ok := optionSubQuestionsInterface.([]interface{}); ok {
											log.Printf("Processing %d option sub-questions for option %d", len(optionSubQuestionsArray), k+1)
											for l, optionSubQuestionInterface := range optionSubQuestionsArray {
												if optionSubQuestionMap, ok := optionSubQuestionInterface.(map[string]interface{}); ok {
													log.Printf("Processing option sub-question %d: %+v", l+1, optionSubQuestionMap)
													if optionSubAttribute := cs.transformQuestionToAttribute(tenantId, optionSubQuestionMap); optionSubAttribute != nil {
														attributes = append(attributes, optionSubAttribute)
														log.Printf("Added option sub-attribute: %+v", optionSubAttribute)
													}
												}
											}
										}
									}
								}
							}
						}
					}
				}
			}
		}
	}

	log.Printf("Total attributes created: %d", len(attributes))

	serviceDefinition := map[string]interface{}{
		"tenantId":   tenantId,
		"code":       checklistCode,
		"isActive":   true,
		"attributes": attributes,
		"clientId":   checklistCode,
	}

	payload := map[string]interface{}{
		"RequestInfo":       requestInfo,
		"ServiceDefinition": serviceDefinition,
	}

	log.Printf("=== FINAL SERVICE DEFINITION PAYLOAD ===")
	logJSON("ServiceDefinition:", serviceDefinition)

	return payload
}

// transformQuestionToAttribute converts MDMS question format to service definition attribute format
func (cs *ChecklistService) transformQuestionToAttribute(tenantId string, question map[string]interface{}) map[string]interface{} {
	// Extract basic fields
	title, _ := question["title"].(string)
	if title == "" {
		log.Printf("Skipping question without title: %+v", question)
		return nil // Skip questions without title
	}

	log.Printf("Transforming question with title: '%s'", title)

	isRequired, _ := question["isRequired"].(bool)
	key, _ := question["key"].(float64)

	// Get question type
	var dataType string
	if typeInterface, ok := question["type"]; ok {
		if typeMap, ok := typeInterface.(map[string]interface{}); ok {
			if code, ok := typeMap["code"].(string); ok {
				dataType = cs.mapDataType(code)
				log.Printf("Mapped data type from '%s' to '%s'", code, dataType)
			}
		}
	}

	attribute := map[string]interface{}{
		"tenantId": tenantId,
		"code":     title, // Using title as code
		"dataType": dataType,
		"isActive": true,
		"required": isRequired,
		"order":    strconv.Itoa(int(key)),
	}

	// Handle regex for Text fields
	if regex, ok := question["regex"]; ok {
		attribute["regex"] = regex
		log.Printf("Added regex to attribute: %v", regex)
	}

	// Handle options for SingleValueList and MultiValueList types
	if dataType == "SingleValueList" || dataType == "MultiValueList" {
		if values := cs.extractOptionValues(question); len(values) > 0 {
			attribute["values"] = values
			log.Printf("Added values to %s attribute: %v", dataType, values)
		}
	}

	log.Printf("Created attribute: %+v", attribute)
	return attribute
}

// extractOptionValues extracts option labels from question data
func (cs *ChecklistService) extractOptionValues(question map[string]interface{}) []string {
	optionsInterface, ok := question["options"]
	if !ok {
		log.Printf("No options found in question")
		return nil
	}

	optionsArray, ok := optionsInterface.([]interface{})
	if !ok {
		log.Printf("Options is not an array")
		return nil
	}

	var values []string
	log.Printf("Processing %d options", len(optionsArray))

	for i, optionInterface := range optionsArray {
		optionMap, ok := optionInterface.(map[string]interface{})
		if !ok {
			log.Printf("Option %d is not a map", i+1)
			continue
		}

		label, ok := optionMap["label"].(string)
		if ok && label != "" {
			values = append(values, label)
			log.Printf("Added option value: '%s'", label)
		} else {
			log.Printf("Option %d has no valid label", i+1)
		}
	}

	log.Printf("Extracted %d option values: %v", len(values), values)
	return values
}

// mapDataType maps MDMS data types to service definition data types
func (cs *ChecklistService) mapDataType(mdmsType string) string {
	mapping := map[string]string{
		"SingleValueList": "SingleValueList",
		"MultiValueList":  "MultiValueList",
		"String":          "Text",
		"Text":            "Text",
		"Number":          "Number",
		"Date":            "Date",
		"Boolean":         "Boolean",
	}

	if mappedType, exists := mapping[mdmsType]; exists {
		return mappedType
	}

	log.Printf("Unknown data type '%s', defaulting to 'Text'", mdmsType)
	return "Text" // Default fallback
}

func (cs *ChecklistService) callAPI(method, url string, payload map[string]interface{}) (map[string]interface{}, error) {
	log.Printf("=== API CALL ===")
	log.Printf("Calling API %s %s", method, url)

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		log.Printf("Failed to marshal payload: %v", err)
		return nil, fmt.Errorf("failed to marshal payload: %w", err)
	}

	log.Printf("Request payload size: %d bytes", len(jsonPayload))

	req, err := http.NewRequest(method, url, bytes.NewBuffer(jsonPayload))
	if err != nil {
		log.Printf("Failed to create request: %v", err)
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := cs.HttpClient.Do(req)
	if err != nil {
		log.Printf("Failed to execute request: %v", err)
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	log.Printf("Response status: %d", resp.StatusCode)

	if resp.StatusCode >= 400 {
		log.Printf("API call failed with status: %d", resp.StatusCode)
		return nil, fmt.Errorf("API call failed with status: %d", resp.StatusCode)
	}

	var result map[string]interface{}
	err = json.NewDecoder(resp.Body).Decode(&result)
	if err != nil {
		log.Printf("Failed to decode response: %v", err)
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	log.Printf("API call successful")
	return result, nil
}

// Helper function to log JSON data nicely
func logJSON(label string, data interface{}) {
	jsonBytes, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		log.Printf("%s (marshal error): %v", label, err)
		return
	}
	log.Printf("%s\n%s", label, string(jsonBytes))
}
