package service

import (
	"bytes"
	"encoding/json"
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

func (l *LocalizationService) SendLocalizationMessage(messages []model.Message, req model.ServiceRequest) (map[string]interface{}, error) {
	tenantId := req.Service.TenantId

	url := os.Getenv("LOCALIZATION_SERVICE_HOST") + os.Getenv("LOCALIZATION_CONTEXT_PATH") + os.Getenv("LOCALIZATION_UPSERT_ENDPOINT")
	payload := model.Localization{
		RequestInfo: req.RequestInfo,
		TenantID: tenantId,
		Messages: messages,
	}

	var result map[string]interface{}
	err := l.mdms_service.restCallRepo.Post(url, payload, &result)
	if err != nil {
		log.Println(err.Error())
		return result, err;
	}

	log.Println(result)

	return result, nil
} 

func (l *LocalizationService) BasicLocalization(data map[string]interface{}, req model.ServiceRequest) {
	var messages []model.Message
	locale := os.Getenv("NOTIFICATION_LOCALE")
	module := strings.ToUpper(req.Service.Module) + "_" + strings.ToUpper(req.Service.BusinessService)
	
	localizationModule := os.Getenv("LOCALIZATION_MODULE") + strings.ToLower(req.Service.Module)
	set := make(map[string]struct{})
	fields := data["fields"].([]interface{})

	for key := range fields {
		value := fields[key].(map[string]interface{})
		heading := value["name"].(string)
		headingLabel := value["label"].(string)
		
		message := model.Message{
			Code: module + "_" + strings.ToUpper(heading),
			Message: headingLabel,
			Locale: locale,
			Module: localizationModule,
		}
		if _, exists := set[message.Code]; exists {
			//already exists
		} else {
			messages = append(messages, message)
			set[message.Code] = struct{}{}
		}
		
		properties := value["properties"].([]interface{})
		
		for key := range properties {
			value := properties[key].(map[string]interface{})
			fieldName := value["name"].(string)
			fieldLabel := value["label"].(string)
			message := model.Message{
				Code: module + "_" + strings.ToUpper(fieldName),
				Message: fieldLabel,
				Locale: locale,
				Module: localizationModule,
			}
			if _, exists := set[message.Code]; exists {
				//already exists
			} else {
				messages = append(messages, message)
				set[message.Code] = struct{}{}
			}
			if dropdownVals, found := value["values"].([]interface{}); found {
				for key := range dropdownVals {
					message := model.Message{
						Code: module + "_" + strings.ToUpper(fieldName) + "_" + strings.ToUpper(dropdownVals[key].(string)),
						Message: dropdownVals[key].(string),
						Locale: locale,
						Module: localizationModule,
					}
					if _, exists := set[message.Code]; exists {
						//already exists
					} else {
						messages = append(messages, message)
						set[message.Code] = struct{}{}
					}
				}	
			} else {
				//do nothing
			}
		}
	}
	log.Println(messages)
	resp, err := l.SendLocalizationMessage(messages, req)
	log.Println(resp)
	log.Println(err)
}
func (l *LocalizationService) SMSLocalization(data map[string]interface{},req model.ServiceRequest) (map[string]interface{}, error) {
	localization := data["localization"].(map[string]interface{})
	modules := localization["modules"].([]interface{})
	module := modules[0].(string)
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
	resp, err := l.SendLocalizationMessage(messages, req)
	
	return resp, err
}

func(l *LocalizationService) Localization(data map[string]interface{}, req model.ServiceRequest) error{
	var messages []model.Message
	locale := os.Getenv("NOTIFICATION_LOCALE")
	module := strings.ToUpper(req.Service.Module) + "_" + strings.ToUpper(req.Service.BusinessService)
	
	localizationModule := os.Getenv("LOCALIZATION_MODULE") + strings.ToLower(req.Service.Module)

	message := model.Message{
		Code: module + "_" + "HEADING", 
		Message: strings.ToUpper(req.Service.Module) + " " +strings.ToUpper(req.Service.BusinessService),
		Locale: locale,
		Module: localizationModule,
	}
	messages = append(messages, message)

	field := []string{"NEXT", "ADD", "SUBMIT", "OWNERNAME", "ADDRESS", "PINCODE", "STREETNAME", "CITY", "ACTIONS", "VIEW_APPLICATION", "APPLICANTDETAILS",
"TENANTID", "LATITUDE", "LONGITUDE", "ADDRESSNUMBER", "ADDRESSLINE1", "HIERARCHYTYPE", "BOUNDARYLEVEL", "BOUNDARYCODE", "TYPE", "USERID", "ACTIVE", "ADDRESS_DETAILS", "APPLICATION_DETAILS"}
	for key := range field {
		message := model.Message{
			Code: module + "_" + field[key],
			Message: field[key],
			Locale: locale,
			Module: localizationModule,
		}
		messages = append(messages, message)
	}
	
	module = strings.ToUpper(req.Service.Module)

	message = model.Message{
			Code: module + "_" + "SEARCH_HEADER",
			Message: module + " SEARCH",
			Locale: locale,
			Module: localizationModule,
	}
	messages = append(messages, message)
	message = model.Message{
			Code: module + "_" + "INBOX_HEADER",
			Message: module + " INBOX",
			Locale: locale,
			Module: localizationModule,
	}
	messages = append(messages, message)

	
	field1 := []string{"APPLICATION_NUMBER", "STATUS", "TODATE", "FROMDATE", "BUSINESS_SERVICE"}
	for key := range field1 {
		message := model.Message{
			Code: module + "_" + field1[key],
			Message: field1[key],
			Locale: locale,
			Module: localizationModule,
		}
		messages = append(messages, message)
	}

	resp, err := l.SendLocalizationMessage(messages, req)
	if err != nil {
		log.Println(err)
		return err
	}

	log.Println(resp)

	return nil
}

func (l LocalizationService) WorkflowLocalization(data map[string]interface{}, req model.ServiceRequest) {
	var messages []model.Message
	locale := os.Getenv("NOTIFICATION_LOCALE")
	module := "WF_" + strings.ToUpper(req.Service.Module) + "_" 
	
	localizationModule := os.Getenv("LOCALIZATION_MODULE") + strings.ToLower(req.Service.Module)

	actionArr := make(map[string]struct{})
	stateArr := make(map[string]struct{})

	workflow := data["workflow"].(map[string]interface{})
	businessService := workflow["businessService"].(string)
	actionModuleArr := strings.Split(businessService, ".")
	actionModule := ""

	for key := range actionModuleArr {
		actionModule += strings.ToUpper(actionModuleArr[key])  
		actionModule += "_"
	}
	actionModule += "ACTION_"
	log.Println(actionModule)
	states := workflow["states"].([]interface{})
	for key := range states {
		state := states[key].(map[string]interface{})
		actions := state["actions"].([]interface{})

		if state["state"] != nil {
			stateArr[state["state"].(string)] = struct{}{}
		}

		for key := range actions {
			action := actions[key].(map[string]interface{})
			actionArr[action["action"].(string)] = struct{}{}
		}
	}

	for key := range actionArr {
		message := model.Message{
			Code: module + strings.ToUpper(req.Service.BusinessService) + "STATUS_" + key,
			Message: "Application Status: " + key,
			Locale: locale,
			Module: localizationModule,
		}
		messages = append(messages, message)
	}

	for key := range actionArr {
		message := model.Message{
			Code: module + actionModule + key,
			Message: key,
			Locale: locale,
			Module: localizationModule,
		}
		messages = append(messages, message)
	}

	for key := range stateArr {
		message := model.Message{
			Code: module + strings.ToUpper(req.Service.BusinessService) + "STATE_" + key,
			Message: "Current State: " + key,
			Locale: locale,
			Module: localizationModule,
		}
		messages = append(messages, message)
	}
	log.Println(messages)
	resp, err := l.SendLocalizationMessage(messages, req)
	log.Println(resp)
	log.Println(err)
}
