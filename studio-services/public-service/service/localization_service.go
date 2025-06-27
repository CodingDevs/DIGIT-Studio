package service

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"public-service/model"
	"public-service/repository"
	"strings"
)

type LocalizationService struct {
	restCallRepo repository.RestCallRepository
	mdms_service MDMSV2Service
}

func NewLocalizationService(repo repository.RestCallRepository, mdms_service MDMSV2Service) *LocalizationService {
	return &LocalizationService{
		restCallRepo: repo,
		mdms_service: mdms_service,
	}
}

/*
	func (l *LocalizationService) GetLocalizationMessage(requestInfo model.RequestInfo, code string, tenantID string) map[string]string {
		msgDetail := make(map[string]string)
		locale := os.Getenv("NOTIFICATION_LOCALE")

		if requestInfo.MsgId != "" {
			parts := strings.Split(requestInfo.MsgId, "|")
			if len(parts) >= 2 {
				locale = parts[1]
			}
		}

		// Build URL
		url := fmt.Sprintf("%s%s%s?locale=%s&tenantId=%s&module=digit-studio&codes=%s",
			os.Getenv("LOCALIZATION_SERVICE_HOST"),
			os.Getenv("LOCALIZATION_CONTEXT_PATH"),
			os.Getenv("LOCALIZATION_SEARCH_ENDPOINT"),
			locale,
			tenantID, // ensure tenantID has at least 2 chars
			code,
		)

		// Create request body
		reqBody := map[string]interface{}{
			"RequestInfo": requestInfo,
		}
		bodyBytes, err := json.Marshal(reqBody)
		if err != nil {
			log.Printf("Error marshalling request: %v", err)
			return msgDetail
		}

		// Send POST request
		resp, err := http.Post(url, "application/json", bytes.NewBuffer(bodyBytes))
		if err != nil {
			log.Printf("Error calling localization service: %v", err)
			return msgDetail
		}
		defer resp.Body.Close()

		var result map[string]interface{}
		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			log.Printf("Error decoding localization response: %v", err)
			return msgDetail
		}

		// Extract message using oliveagle/jsonpath
		message := ""
		jsonPathExpr, err := jsonpath.Compile("$.messages[0].message")
		if err != nil {
			log.Printf("Error compiling jsonpath: %v", err)
		} else {
			if val, err := jsonPathExpr.Lookup(result); err == nil {
				if msgStr, ok := val.(string); ok {
					message = msgStr
				}
			} else {
				log.Printf("Error looking up jsonpath: %v", err)
			}
		}

		msgDetail["message"] = message
		msgDetail["templateId"] = "" // templateId is null in original logic

		return msgDetail
	}
*/
func (l *LocalizationService) GetLocalizationMessage(requestInfo model.RequestInfo, code string, tenantID string) map[string]string {
	msgDetail := make(map[string]string)
	locale := os.Getenv("NOTIFICATION_LOCALE")

	if requestInfo.MsgId != "" {
		parts := strings.Split(requestInfo.MsgId, "|")
		if len(parts) >= 2 {
			locale = parts[1]
		}
	}
//TODO: use module specified in the config 
	url := fmt.Sprintf("%s%s%s?locale=%s&tenantId=%s&module=digit-studio&codes=%s",
		os.Getenv("LOCALIZATION_SERVICE_HOST"),
		os.Getenv("LOCALIZATION_CONTEXT_PATH"),
		os.Getenv("LOCALIZATION_SEARCH_ENDPOINT"),
		locale,
		tenantID,
		code,
	)

	reqBody := map[string]interface{}{
		"RequestInfo": requestInfo,
	}
	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		log.Printf("Error marshalling request body: %v", err)
		return msgDetail
	}

	// 🔍 Print request body as pretty JSON
	var prettyReq bytes.Buffer
	if err := json.Indent(&prettyReq, bodyBytes, "", "  "); err == nil {
		log.Printf("Localization Request Body:\n%s", prettyReq.String())
	} else {
		log.Printf("Failed to format request body: %v", err)
	}

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(bodyBytes))
	if err != nil {
		log.Printf("Error calling localization service: %v", err)
		return msgDetail
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("Error reading response body: %v", err)
		return msgDetail
	}

	// 🔍 Print response body as pretty JSON
	var prettyResp bytes.Buffer
	if err := json.Indent(&prettyResp, respBytes, "", "  "); err == nil {
		log.Printf("Localization Response Body:\n%s", prettyResp.String())
	} else {
		log.Printf("Failed to format response body: %v", err)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(respBytes, &result); err != nil {
		log.Printf("Error decoding localization response: %v", err)
		return msgDetail
	}

	if messages, ok := result["messages"].([]interface{}); ok && len(messages) > 0 {
		firstMsg := messages[0]
		if msgMap, ok := firstMsg.(map[string]interface{}); ok {
			if msgStr, ok := msgMap["message"].(string); ok {
				msgDetail["message"] = msgStr
			} else {
				log.Printf("Message field missing or not a string in first message: %v", firstMsg)
			}
		} else {
			log.Printf("First message is not a valid map: %v", firstMsg)
		}
	} else {
		log.Printf("No messages found in localization response.")
	}

	msgDetail["templateId"] = ""
	return msgDetail
}

func (l *LocalizationService) SendLocalizationMessage(req model.ServiceRequest) (map[string]interface{}, error) {
	tenantId := req.Service.TenantId
	business_service := req.Service.BusinessService
	module := req.Service.Module

	schemaCode := os.Getenv("SERVICE_MODULE_NAME") + "." + os.Getenv("SERVICE_MASTER_NAME")
	filters := map[string]string{
		"service": business_service, 
		"module": module, 
	}
	resp, _ := l.mdms_service.SearchMDMS(tenantId, schemaCode, filters, req.RequestInfo)

	mdmsList, ok := resp["mdms"].([]interface{})
	if !ok || len(mdmsList) == 0 {
		log.Println("MDMS data missing or invalid")
		return nil, errors.New("MDMS data missing or invalid")
	}

	firstEntry, ok := mdmsList[0].(map[string]interface{})
	if !ok {
		log.Println("Invalid MDMS format: first entry is not a map")
		return nil, errors.New("invalid MDMS format: first entry is not a map")
	}

	data, ok := firstEntry["data"].(map[string]interface{})
	if !ok {
		log.Println("Invalid MDMS format: missing or invalid 'data'")
		return nil, errors.New("invalid MDMS format: missing or invalid 'data'")
	}

	localization := data["localization"].(map[string]interface{})
	modules := localization["modules"].([]interface{})
	module = modules[0].(string)
	log.Println(modules)

	notification := data["notification"].(map[string]interface{})
	sms := notification["sms"].([]interface{})
	email := notification["email"].([]interface{})

	var arr []interface{}
	arr = append(arr, sms...)
	arr = append(arr, email...)
	var messages []model.Message
	for _, val := range arr {
		data := val.(map[string]interface{})
		code := data["code"].(string)
		message := data["template"].(string)
		locale := os.Getenv("NOTIFICATION_LOCALE")

		messag :=  model.Message{
			Code: code,
			Message: message,
			Module: module,
			Locale: locale,
		}

		messages = append(messages, messag)	
	}

	url := os.Getenv("LOCALIZATION_SERVICE_HOST") + os.Getenv("LOCALIZATION_CONTEXT_PATH") + os.Getenv("LOCALIZATION_UPSERT_ENDPOINT")
	payload := model.Localization{
		RequestInfo: req.RequestInfo,
		TenantID: tenantId,
		Messages: messages,
	}

	var result map[string]interface{}
	err := l.mdms_service.restCallRepo.Post(url, payload, &result)
	if err != nil {
		return result, err;
	}

	log.Println(result)

	return result, nil
} 
