package service

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"public-service/config"
	"public-service/model"
	"public-service/repository"
	"strings"

	"github.com/Priyansuvaish/digit_client/models"
	"github.com/Priyansuvaish/digit_client/services"
	"github.com/xeipuuv/gojsonschema"
)

type MDMSService struct {
	restCallRepo repository.RestCallRepository
}

func NewMDMSService(repo repository.RestCallRepository) *MDMSService {
	return &MDMSService{
		restCallRepo: repo,
	}
}

func (s *MDMSService) MDMSSearch(criteria model.MdmsCriteria, info model.RequestInfo) (model.MdmsResponse, error) {
	log.Println("MdmsCriteria:", criteria)

	url := config.GetEnv("MDMS_SERVICE_HOST") + config.GetEnv("MDMS_SEARCH_ENDPOINT")
	log.Println("MDMS service URL: " + url)

	// Create the request body
	req := map[string]interface{}{
		"RequestInfo":  info,
		"MdmsCriteria": criteria,
	}

	var resp model.MdmsResponse

	err := s.restCallRepo.Post(url, req, &resp)
	if err != nil {
		log.Printf("Error calling MDMS service: %v", err)
		return model.MdmsResponse{}, err
	}

	log.Println("MDMS Response:", resp)
	return resp, nil
}

func (s *MDMSService) MdmsSearchWithFilter(req model.ApplicationRequest) interface{} {
	filter := map[string]interface{}{
		"module":  req.Application.Module,
		"service": req.Application.BusinessService,
	}
	MdmsCriteria := models.MdmsCriteriaV2Builder().WithTenantID(req.Application.TenantId).WithFilterMap(filter).WithSchemaCode(os.Getenv("SERVICE_MODULE_NAME") + "." + os.Getenv("SERVICE_MASTER_NAME")).WithLimit(10).WithOffeset(0).Build()
	mdmsserice := services.NewMdmsV2Service(nil, os.Getenv("MDMS_SEARCH_V2_ENDPOINT"))
	requestInfo := &models.RequestInfo{
		APIID:     req.RequestInfo.ApiId,
		Ver:       req.RequestInfo.Ver,
		Ts:        int64(req.RequestInfo.Ts),
		Action:    req.RequestInfo.Action,
		Did:       req.RequestInfo.Did,
		Key:       req.RequestInfo.Key,
		MsgID:     req.RequestInfo.MsgId,
		AuthToken: req.RequestInfo.AuthToken,
		UserInfo: map[string]interface{}{
			"uuid":          req.RequestInfo.UserInfo.Uuid,
			"userName":      req.RequestInfo.UserInfo.UserName,
			"name":          req.RequestInfo.UserInfo.Name,
			"emailId":       req.RequestInfo.UserInfo.EmailId,
			"mobileNumber":  req.RequestInfo.UserInfo.MobileNumber,
			"roles":         req.RequestInfo.UserInfo.Roles,
			"tenantId":      req.RequestInfo.UserInfo.TenantId,
			"locale":        req.RequestInfo.UserInfo.Locale,
			"type":          req.RequestInfo.UserInfo.Type,
			"active":        req.RequestInfo.UserInfo.Active,
			"permanentCity": req.RequestInfo.UserInfo.PermanentCity,
		},
	}
	// fmt.Println("requestinfo", requestInfo.ToMap())
	// fmt.Println("mdmscreatia", MdmsCriteria.ToMap())
	// Print only the servicedetail part
	// fmt.Println("servicedetail", req.Application.ServiceDetails)
	search, err := mdmsserice.SearchMDMS(MdmsCriteria, requestInfo)
	if err != nil {
		log.Printf("API call failed: %v", err)
	}

	searchMap, ok := search.(map[string]interface{})
	if !ok {
		log.Println("Failed to assert search as map[string]interface{}")
		return nil
	}
	mdmsSlice, ok := searchMap["mdms"].([]interface{})
	if !ok || len(mdmsSlice) == 0 {
		log.Println("No mdms data found")
		return nil
	}

	firstMdmsEntry, ok := mdmsSlice[0].(map[string]interface{})
	if !ok {
		log.Println("Invalid mdms entry format")
		return nil
	}

	dataMap, ok := firstMdmsEntry["data"].(map[string]interface{})
	if !ok {
		log.Println("No data field found in mdms entry")
		return nil
	}

	fields, ok := dataMap["fields"]
	if !ok {
		log.Println("No fields found in data")
		return nil
	}
	return fields
}

// validateServiceDetailsWithSchema validates the service details against the fields schema
func (s *MDMSService) ValidateServiceDetailsWithSchema(serviceDetails model.ApplicationRequest, fieldsSchema interface{}) error {
	// Convert the service details to JSON string
	service := convertServiceDetailToJSONSchema(serviceDetails.Application.ServiceDetails)
	detailsBytes, err := json.Marshal(service)
	fmt.Println(string(detailsBytes))
	if err != nil {
		return fmt.Errorf("failed to marshal service details: %v", err)
	}
	// Convert the fields schema to a proper JSON Schema
	jsonSchema, err := convertFieldsToJSONSchema(fieldsSchema, serviceDetails)
	if err != nil {
		return fmt.Errorf("failed to convert fields to JSON schema: %v", err)
	}

	// Convert the schema to JSON string
	schemaBytes, err := json.Marshal(jsonSchema)
	if err != nil {
		return fmt.Errorf("failed to marshal JSON schema: %v", err)
	}

	// Print the generated schema for debugging
	fmt.Printf("Generated JSON Schema: %s\n", string(schemaBytes))

	// Create schema and document loaders
	schemaLoader := gojsonschema.NewStringLoader(string(schemaBytes))
	documentLoader := gojsonschema.NewStringLoader(string(detailsBytes))

	// Validate the document against the schema
	result, err := gojsonschema.Validate(schemaLoader, documentLoader)
	if err != nil {
		return fmt.Errorf("validation error: %v", err)
	}

	// Check if the validation was successful
	if !result.Valid() {
		var errorMessages []string
		for _, err := range result.Errors() {
			errorMessages = append(errorMessages, fmt.Sprintf("- %s", err))
		}
		return fmt.Errorf("service details validation failed:\n%s", strings.Join(errorMessages, "\n"))
	}

	return nil
}

// convertFieldsToJSONSchema converts fields to a JSON schema and handles references
func convertFieldsToJSONSchema(fieldsSchema interface{}, req model.ApplicationRequest) (map[string]interface{}, error) {
	// Convert fields to a slice if it's not already
	fieldsSlice, ok := fieldsSchema.([]interface{})
	if !ok {
		return nil, fmt.Errorf("fields schema is not a slice")
	}

	// Create the root schema object
	schema := map[string]interface{}{
		"$schema":              "http://json-schema.org/draft-07/schema#",
		"type":                 "object",
		"properties":           map[string]interface{}{},
		"additionalProperties": false,
	}

	rootProperties := schema["properties"].(map[string]interface{})

	// Track references to fetch them in batch
	// Map structure: schemaCode -> property path -> property details
	referencesToFetch := make(map[string]map[string]map[string]interface{})

	// Process each top-level field section in the fields schema
	for _, sectionField := range fieldsSlice {
		sectionMap, ok := sectionField.(map[string]interface{})
		if !ok {
			continue
		}

		// Extract section name and type
		sectionName, hasName := sectionMap["name"].(string)
		if !hasName {
			continue
		}

		sectionType, hasType := sectionMap["type"].(string)
		if !hasType {
			continue
		}

		// Handle different section types
		switch sectionType {
		case "object":
			// Create object schema for this section
			sectionSchema := map[string]interface{}{
				"type":                 "object",
				"properties":           map[string]interface{}{},
				"additionalProperties": false,
			}

			// Process properties within this section
			if properties, hasProps := sectionMap["properties"].([]interface{}); hasProps {
				sectionProperties := sectionSchema["properties"].(map[string]interface{})
				requiredProps := []string{}

				for _, prop := range properties {
					propMap, ok := prop.(map[string]interface{})

					if !ok {
						continue
					}

					propName, hasName := propMap["name"].(string)
					if !hasName {
						continue
					}

					// Check if property has a reference
					if propMap["reference"] != nil {
						// Extract reference details
						if schemaCode, hasSchema := propMap["schema"].(string); hasSchema {
							// Create property path for this reference
							propPath := sectionName + "." + propName

							// Track this reference to fetch later
							if _, exists := referencesToFetch[schemaCode]; !exists {
								referencesToFetch[schemaCode] = make(map[string]map[string]interface{})
							}

							// Store property details with its path
							referencesToFetch[schemaCode][propPath] = propMap

							// Create an enum-based schema for this reference
							propSchema := map[string]interface{}{
								"type": "string",
								// We'll add the enum values after fetching the data
							}

							// Add to required list if needed
							if isRequired, ok := propMap["required"].(bool); ok && isRequired {
								requiredProps = append(requiredProps, propName)
							}

							// Add property to section schema
							sectionProperties[propName] = propSchema
						} else if values, hasValues := propMap["values"].([]interface{}); hasValues {
							propSchema := createPropertySchema(propMap)
							propSchema["enum"] = values

							if isRequired, ok := propMap["required"].(bool); ok && isRequired {
								requiredProps = append(requiredProps, propName)
							}
							fmt.Println("values", propSchema)
							// Add property to section schema
							sectionProperties[propName] = propSchema
						} else {
							// Create property schema for non-reference fields
							propSchema := createPropertySchema(propMap)

							// Add to required list if needed
							if isRequired, ok := propMap["required"].(bool); ok && isRequired {
								requiredProps = append(requiredProps, propName)
							}

							// Add property to section schema
							sectionProperties[propName] = propSchema
						}

					} else {
						// Create property schema for non-reference fields
						propSchema := createPropertySchema(propMap)

						// Add to required list if needed
						if isRequired, ok := propMap["required"].(bool); ok && isRequired {
							requiredProps = append(requiredProps, propName)
						}

						// Add property to section schema
						sectionProperties[propName] = propSchema
					}
				}

				// Add required properties if any
				if len(requiredProps) > 0 {
					sectionSchema["required"] = requiredProps
				}
			}

			// Add section to root schema
			rootProperties[sectionName] = sectionSchema

		case "array":
			// Create array schema for this section
			arraySchema := map[string]interface{}{
				"type": "array",
			}

			// Process items schema if available
			if items, hasItems := sectionMap["items"].(map[string]interface{}); hasItems {
				itemsSchema := map[string]interface{}{
					"type":                 "object",
					"properties":           map[string]interface{}{},
					"additionalProperties": false,
				}

				// Process properties within items
				if itemProps, hasItemProps := items["properties"].([]interface{}); hasItemProps {
					itemProperties := itemsSchema["properties"].(map[string]interface{})
					requiredProps := []string{}

					for _, prop := range itemProps {
						propMap, ok := prop.(map[string]interface{})
						if !ok {
							continue
						}

						propName, hasName := propMap["name"].(string)
						if !hasName {
							continue
						}

						// Check if property has a reference
						if propMap["reference"] != nil {
							// Extract reference details
							if schemaCode, hasSchema := propMap["schema"].(string); hasSchema {
								// Create property path for this reference
								propPath := sectionName + "[]." + propName

								// Track this reference to fetch later
								if _, exists := referencesToFetch[schemaCode]; !exists {
									referencesToFetch[schemaCode] = make(map[string]map[string]interface{})
								}

								// Store property details with its path
								referencesToFetch[schemaCode][propPath] = propMap

								// Create an enum-based schema for this reference
								propSchema := map[string]interface{}{
									"type": "string",
									// We'll add the enum values after fetching the data
								}

								// Add to required list if needed
								if isRequired, ok := propMap["required"].(bool); ok && isRequired {
									requiredProps = append(requiredProps, propName)
								}

								// Add property to items schema
								itemProperties[propName] = propSchema
							} else if values, hasValues := propMap["values"].([]interface{}); hasValues {
								propSchema := createPropertySchema(propMap)
								propSchema["enum"] = values

								if isRequired, ok := propMap["required"].(bool); ok && isRequired {
									requiredProps = append(requiredProps, propName)
								}
								fmt.Println("values", propSchema)
								// Add property to section schema
								itemProperties[propName] = propSchema
							} else {
								// Create property schema for non-reference fields
								propSchema := createPropertySchema(propMap)

								// Add to required list if needed
								if isRequired, ok := propMap["required"].(bool); ok && isRequired {
									requiredProps = append(requiredProps, propName)
								}

								// Add property to section schema
								itemProperties[propName] = propSchema
							}
						} else {
							// Create property schema for non-reference fields
							propSchema := createPropertySchema(propMap)

							// Add to required list if needed
							if isRequired, ok := propMap["required"].(bool); ok && isRequired {
								requiredProps = append(requiredProps, propName)
							}

							// Add property to items schema
							itemProperties[propName] = propSchema
						}
					}

					// Add required properties if any
					if len(requiredProps) > 0 {
						itemsSchema["required"] = requiredProps
					}
				}

				// Add items schema to array schema
				arraySchema["items"] = itemsSchema
			}

			// Add section to root schema
			rootProperties[sectionName] = arraySchema
		}
	}

	// Fetch reference data and update schema if there are references to fetch
	if len(referencesToFetch) > 0 {
		err := mdmsSearchforReference(schema, referencesToFetch, req)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch references: %v", err)
		}
	}
	// fmt.Println(referencesToFetch)
	return schema, nil
}

// fetchReferencesAndUpdateSchema fetches reference data from MDMS and updates the schema
func mdmsSearchforReference(schema map[string]interface{}, referencesToFetch map[string]map[string]map[string]interface{}, req model.ApplicationRequest) error {
	// Create request info for MDMS service
	mdmsService := services.NewMdmsV2Service(nil, os.Getenv("MDMS_SEARCH_V2_ENDPOINT"))
	requestInfo := &models.RequestInfo{
		APIID:     req.RequestInfo.ApiId,
		Ver:       req.RequestInfo.Ver,
		Ts:        int64(req.RequestInfo.Ts),
		Action:    req.RequestInfo.Action,
		Did:       req.RequestInfo.Did,
		Key:       req.RequestInfo.Key,
		MsgID:     req.RequestInfo.MsgId,
		AuthToken: req.RequestInfo.AuthToken,
		UserInfo: map[string]interface{}{
			"uuid":          req.RequestInfo.UserInfo.Uuid,
			"userName":      req.RequestInfo.UserInfo.UserName,
			"name":          req.RequestInfo.UserInfo.Name,
			"emailId":       req.RequestInfo.UserInfo.EmailId,
			"mobileNumber":  req.RequestInfo.UserInfo.MobileNumber,
			"roles":         req.RequestInfo.UserInfo.Roles,
			"tenantId":      req.RequestInfo.UserInfo.TenantId,
			"locale":        req.RequestInfo.UserInfo.Locale,
			"type":          req.RequestInfo.UserInfo.Type,
			"active":        req.RequestInfo.UserInfo.Active,
			"permanentCity": req.RequestInfo.UserInfo.PermanentCity,
		},
	}
	// Fetch data for each schema code
	for schemaCode, propPaths := range referencesToFetch {
		fmt.Println("schemaCode", schemaCode)
		// Build MDMS criteria
		mdmsCriteria := models.MdmsCriteriaV2Builder().
			WithTenantID("dev").
			WithSchemaCode(schemaCode).
			WithLimit(100). // Increase limit to get more values
			WithOffeset(0).
			Build()

		// Search MDMS
		searchResult, err := mdmsService.SearchMDMS(mdmsCriteria, requestInfo)
		if err != nil {
			return fmt.Errorf("failed to fetch MDMS data for schema %s: %v", schemaCode, err)
		}

		// Extract codes from the search result
		searchResultMap, ok := searchResult.(map[string]interface{})
		if !ok {
			fmt.Printf("Invalid MDMS response format for schema %s\n", schemaCode)
			continue
		}
		mdmsData, ok := searchResultMap["mdms"].([]interface{})
		if !ok {
			fmt.Printf("Invalid MDMS response format for schema %s\n", schemaCode)
			continue
		}

		// Use a map to ensure uniqueness of codes
		uniqueCodes := make(map[string]bool)
		for _, item := range mdmsData {
			itemMap, ok := item.(map[string]interface{})
			if !ok {
				continue
			}

			data, ok := itemMap["data"].(map[string]interface{})
			if !ok {
				continue
			}

			code, ok := data["code"].(string)
			if !ok {
				continue
			}

			// Add code to map to ensure uniqueness
			uniqueCodes[code] = true
		}

		// Convert unique codes map to slice
		codes := make([]string, 0, len(uniqueCodes))
		for code := range uniqueCodes {
			codes = append(codes, code)
		}

		// Debug: Print the codes we found
		// fmt.Printf("Found %d codes for schema %s: %v\n", len(codes), schemaCode, codes)

		// Update schema with reference data for this schema code
		for propPath := range propPaths {
			// fmt.Printf("Updating property at path: %s with codes\n", propPath)
			updateSchemaPropertyWithReference(schema, propPath, codes)
		}
	}

	return nil
}

// updateSchemaPropertyWithReference updates a specific property in the schema with reference data
func updateSchemaPropertyWithReference(schema map[string]interface{}, propPath string, codes []string) {
	// Skip update if no codes were found
	if len(codes) == 0 {
		fmt.Printf("No codes available for property path: %s\n", propPath)
		return
	}

	// Split the property path into components
	parts := strings.Split(propPath, ".")
	if len(parts) < 2 {
		fmt.Printf("Invalid property path: %s\n", propPath)
		return
	}

	sectionName := parts[0]
	propName := parts[1]

	// Check if this is an array item
	isArrayItem := false
	if strings.HasSuffix(sectionName, "[]") {
		isArrayItem = true
		sectionName = strings.TrimSuffix(sectionName, "[]")
	}

	// Get the root properties
	properties, ok := schema["properties"].(map[string]interface{})
	if !ok {
		fmt.Printf("Schema has no properties\n")
		return
	}

	// Get the section
	section, ok := properties[sectionName].(map[string]interface{})
	if !ok {
		fmt.Printf("Section not found: %s\n", sectionName)
		return
	}

	if isArrayItem {
		// Handle array items
		if section["type"] != "array" {
			fmt.Printf("Section %s is not an array\n", sectionName)
			return
		}

		items, ok := section["items"].(map[string]interface{})
		if !ok {
			fmt.Printf("Section %s has no items\n", sectionName)
			return
		}

		itemProps, ok := items["properties"].(map[string]interface{})
		if !ok {
			fmt.Printf("Items in section %s has no properties\n", sectionName)
			return
		}

		prop, ok := itemProps[propName].(map[string]interface{})
		if !ok {
			fmt.Printf("Property %s not found in items of section %s\n", propName, sectionName)
			return
		}

		// Add enum to the property
		prop["enum"] = codes
		// fmt.Printf("Added enum with %d values to %s[].%s\n", len(codes), sectionName, propName)
	} else {
		// Handle regular object properties
		sectionProps, ok := section["properties"].(map[string]interface{})
		if !ok {
			fmt.Printf("Section %s has no properties\n", sectionName)
			return
		}

		prop, ok := sectionProps[propName].(map[string]interface{})
		if !ok {
			fmt.Printf("Property %s not found in section %s\n", propName, sectionName)
			return
		}

		// Add enum to the property
		prop["enum"] = codes
		// fmt.Printf("Added enum with %d values to %s.%s\n", len(codes), sectionName, propName)
	}
}

// createPropertySchema creates a JSON schema for a single property
func createPropertySchema(propMap map[string]interface{}) map[string]interface{} {
	propSchema := map[string]interface{}{}

	// Set field type
	if propType, ok := propMap["type"].(string); ok {
		switch propType {
		case "string", "number", "integer", "boolean", "array", "object":
			propSchema["type"] = propType
		case "date":
			// For date type, use string with date format
			propSchema["type"] = "string"
			propSchema["format"] = "date"
		default:
			propSchema["type"] = "string" // Default to string
		}
	} else {
		propSchema["type"] = "string" // Default type
	}

	// Set format if available and not already set
	if _, hasFormat := propSchema["format"]; !hasFormat {
		if format, ok := propMap["format"].(string); ok {
			// Handle special formats
			switch format {
			case "radioordropdown":
				// No special format for these UI controls
			case "text":
				// No special format for text
			default:
				propSchema["format"] = format
			}
		}
	}

	// Set min/max length for strings
	if propSchema["type"] == "string" {
		if minLength, ok := propMap["minLength"].(float64); ok {
			propSchema["minLength"] = int(minLength)
		}

		if maxLength, ok := propMap["maxLength"].(float64); ok {
			propSchema["maxLength"] = int(maxLength)
		}
	}

	// Set pattern from validation.regex if available
	if validation, ok := propMap["validation"].(map[string]interface{}); ok {
		if regex, ok := validation["regex"].(string); ok {
			propSchema["pattern"] = regex
		}
	}

	// Set default value if available
	if defaultValue, ok := propMap["defaultValue"]; ok {
		propSchema["default"] = defaultValue
	}

	// Handle dependencies if needed
	if dependencies, ok := propMap["dependencies"].([]interface{}); ok && len(dependencies) > 0 {
		// In JSON Schema, dependencies are more complex
		// For simplicity, we'll just note that this property has dependencies
		propSchema["description"] = "This field has dependencies"
	}

	return propSchema
}

func convertServiceDetailToJSONSchema(fields map[string]interface{}) map[string]interface{} {
	updatedFields := make(map[string]interface{})

	for key, value := range fields {
		switch v := value.(type) {
		case map[string]interface{}:
			// Check if the map contains a 'code' field
			if code, hasCode := v["code"]; hasCode {
				updatedFields[key] = code
			} else {
				// Recursively update nested map
				updatedFields[key] = convertServiceDetailToJSONSchema(v)
			}
		default:
			// Keep the original value
			updatedFields[key] = value
		}
	}

	return updatedFields
}
