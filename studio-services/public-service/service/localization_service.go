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
	"unicode"
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
	log.Printf("Calling Localization Service URL: %s", url)
	logJSON("Localization Request", reqBody)
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(bodyBytes))
	if err != nil {
		log.Printf("Error calling localization service: %v", err)
		return msgDetail
	}
	defer resp.Body.Close()
	logJSON("Localization Response :", resp)

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

// toTitleCase converts a string to Title Case with spaces
func toTitleCase(s string) string {
	if s == "" {
		return s
	}

	// Split by spaces, hyphens, underscores, and other common delimiters
	words := strings.FieldsFunc(s, func(c rune) bool {
		return !unicode.IsLetter(c) && !unicode.IsNumber(c)
	})

	if len(words) == 0 {
		return s
	}

	// Convert each word to title case and join with spaces
	var titleWords []string
	for _, word := range words {
		if len(word) > 0 {
			titleWords = append(titleWords, strings.Title(strings.ToLower(word)))
		}
	}

	return strings.Join(titleWords, " ")
}

// convertMessagesToTitleCase converts all message content to Title Case
func convertMessagesToTitleCase(messages []model.Message) []model.Message {
	convertedMessages := make([]model.Message, len(messages))

	for i, msg := range messages {
		convertedMessages[i] = msg
		// Convert the message content to Title Case
		convertedMessages[i].Message = toTitleCase(msg.Message)
	}

	return convertedMessages
}

func (l *LocalizationService) SendLocalizationMessage(messages []model.Message, req model.ServiceRequest) (map[string]interface{}, error) {
	tenantId := req.Service.TenantId

	url := os.Getenv("LOCALIZATION_SERVICE_HOST") + os.Getenv("LOCALIZATION_CONTEXT_PATH") + os.Getenv("LOCALIZATION_UPSERT_ENDPOINT")

	// Convert all message content to Title Case
	titleCaseMessages := removeDuplicateCodes(convertMessagesToTitleCase(messages))

	payload := model.Localization{
		RequestInfo: req.RequestInfo,
		TenantID:    tenantId,
		Messages:    titleCaseMessages,
	}
	logJSON("Localization Payload", payload)

	var result map[string]interface{}
	err := l.mdms_service.restCallRepo.Post(url, payload, &result)
	if err != nil {
		log.Println(err.Error())
		return result, err
	}

	log.Println(result)

	return result, nil
}

func (l *LocalizationService) SendLocalizationMessageOne(messages []model.Message, req model.ServiceRequest) (map[string]interface{}, error) {
	tenantId := req.Service.TenantId

	url := os.Getenv("LOCALIZATION_SERVICE_HOST") + os.Getenv("LOCALIZATION_CONTEXT_PATH") + os.Getenv("LOCALIZATION_UPSERT_ENDPOINT")
	payload := model.Localization{
		RequestInfo: req.RequestInfo,
		TenantID:    tenantId,
		Messages:    messages,
	}
	logJSON("Localization Payload", payload)
	var result map[string]interface{}
	err := l.mdms_service.restCallRepo.Post(url, payload, &result)
	if err != nil {
		log.Println(err.Error())
		return result, err
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
	set[""] = struct{}{}
	set[""] = struct{}{}
	set[""] = struct{}{}
	field := []string{"NAME", "MOBILENUMBER", "GENDER", "EMAILID"}
	for key := range field {
		message := model.Message{
			Code:    module + "_" + field[key],
			Message: field[key],
			Locale:  locale,
			Module:  localizationModule,
		}
		messages = append(messages, message)
		set[message.Code] = struct{}{}
	}

	for key := range fields {
		value := fields[key].(map[string]interface{})
		heading := value["name"].(string)
		headingLabel := value["label"].(string)

		message := model.Message{
			Code:    module + "_" + strings.ToUpper(heading),
			Message: headingLabel,
			Locale:  locale,
			Module:  localizationModule,
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
				Code:    module + "_" + strings.ToUpper(fieldName),
				Message: fieldLabel,
				Locale:  locale,
				Module:  localizationModule,
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
						Code:    module + "_" + strings.ToUpper(fieldName) + "_" + strings.ToUpper(dropdownVals[key].(string)),
						Message: dropdownVals[key].(string),
						Locale:  locale,
						Module:  localizationModule,
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
func (l *LocalizationService) SMSLocalization(data map[string]interface{}, req model.ServiceRequest) (map[string]interface{}, error) {
	localization := data["localization"].(map[string]interface{})
	modules := localization["modules"].([]interface{})
	module := modules[0].(string)

	if modulesJSON, err := json.Marshal(modules); err == nil {
		log.Printf(`{"level":"info","event":"ModulesFetched","modules":%s}`, modulesJSON)
	} else {
		log.Printf(`{"level":"error","event":"ModulesMarshalError","error":"%s"}`, err.Error())
	}

	notification := data["notification"].(map[string]interface{})
	sms := notification["sms"].([]interface{})
	email := notification["email"].([]interface{})

	var arr []interface{}
	arr = append(arr, sms...)
	arr = append(arr, email...)

	var messages []model.Message
	seenKeys := make(map[string]bool)

	locale := os.Getenv("NOTIFICATION_LOCALE")

	for _, val := range arr {
		item := val.(map[string]interface{})
		code := item["code"].(string)
		message := item["template"].(string)
		// Replace spaces with underscores in code
		code = strings.ReplaceAll(code, " ", "_")

		// Build composite key: locale|module|code
		uniqueKey := fmt.Sprintf("%s|%s|%s", locale, module, code)
		if seenKeys[uniqueKey] {
			continue
		}
		seenKeys[uniqueKey] = true

		msg := model.Message{
			Code:    code,
			Message: message,
			Module:  module,
			Locale:  locale,
		}
		messages = append(messages, msg)
	}

	// Log messages in JSON
	if messagesJSON, err := json.Marshal(messages); err == nil {
		log.Printf(`{"level":"info","event":"MessagesPrepared","messages":%s}`, messagesJSON)
	} else {
		log.Printf(`{"level":"error","event":"MessagesMarshalError","error":"%s"}`, err.Error())
	}

	resp, err := l.SendLocalizationMessage(messages, req)
	if err != nil {
		log.Printf(`{"level":"error","event":"SendLocalizationMessageFailed","error":"%s"}`, err.Error())
	} else {
		log.Printf(`{"level":"info","event":"SendLocalizationMessageSuccess"}`)
	}

	return resp, err
}

func (l *LocalizationService) Localization(data map[string]interface{}, req model.ServiceRequest) error {
	var messages []model.Message
	locale := os.Getenv("NOTIFICATION_LOCALE")
	module := strings.ToUpper(req.Service.Module) + "_" + strings.ToUpper(req.Service.BusinessService)

	localizationModule := os.Getenv("LOCALIZATION_MODULE") + strings.ToLower(req.Service.Module)

	message := model.Message{
		Code:    module + "_" + "HEADING",
		Message: strings.ToUpper(req.Service.Module) + " " + strings.ToUpper(req.Service.BusinessService),
		Locale:  locale,
		Module:  localizationModule,
	}
	messages = append(messages, message)

	field := []string{"NEXT", "ADD", "SUBMIT", "OWNERNAME", "DOWNLOAD", "ADDRESS", "DOCUMENTS", "PINCODE", "STREETNAME", "CITY", "ACTIONS", "VIEW_APPLICATION", "APPLICANTDETAILS",
		"TENANTID", "LATITUDE", "APPLICANT", "LONGITUDE", "ADDRESSNUMBER", "ADDRESSLINE1", "HIERARCHYTYPE", "BOUNDARYLEVEL", "BOUNDARYCODE", "TYPE", "USERID", "ACTIVE", "ADDRESS_DETAILS"}
	for key := range field {
		message := model.Message{
			Code:    module + "_" + field[key],
			Message: field[key],
			Locale:  locale,
			Module:  localizationModule,
		}
		messages = append(messages, message)
	}

	

	message = model.Message{
		Code:     strings.ToUpper(req.Service.Module) + "_" + "SEARCH_HEADER",
		Message:  strings.ToUpper(req.Service.Module) + " SEARCH",
		Locale:  locale,
		Module:  localizationModule,
	}
	messages = append(messages, message)
	message = model.Message{
		Code:     strings.ToUpper(req.Service.Module) + "_" + "INBOX_HEADER",
		Message:  strings.ToUpper(req.Service.Module) + " INBOX",
		Locale:  locale,
		Module:  localizationModule,
	}
	messages = append(messages, message)
	message = model.Message{
		Code:    strings.ToUpper(req.Service.Module) + "_" + "HEADING",
		Message: strings.ToUpper(req.Service.Module),
		Locale:  locale,
		Module:  "rainmaker-common",
	}
	messages = append(messages, message)
	message = model.Message{
		Code:    strings.ToUpper(req.Service.Module) + "_" + "SEARCH",
		Message: strings.ToUpper(req.Service.Module) + " SEARCH",
		Locale:  locale,
		Module:  "rainmaker-common",
	}
	messages = append(messages, message)
	message = model.Message{
		Code:    strings.ToUpper(req.Service.Module) + "_" + "INBOX",
		Message: strings.ToUpper(req.Service.Module) + " INBOX",
		Locale:  locale,
		Module:  "rainmaker-common",
	}
	messages = append(messages, message)

	message = model.Message{
		Code:    strings.ToUpper(req.Service.Module) + "_" + "CARDDESCRIPTION",
		Message: strings.ToUpper(req.Service.Module) + " SERVICE ",
		Locale:  locale,
		Module:  "rainmaker-common",
	}
	messages = append(messages, message)

	message = model.Message{
		Code:    strings.ToUpper(req.Service.Module) + "_" + "HOW_IT_WORKS",
		Message: "How It Works",
		Locale:  locale,
		Module:  "rainmaker-common",
	}
	messages = append(messages, message)

	message = model.Message{
		Code:    strings.ToUpper(req.Service.Module) + "_" + "ASSIGNED_TO_ME",
		Message:  " Assigned To Me",
		Locale:  locale,
		Module:  localizationModule,
	}
	messages = append(messages, message)
	message = model.Message{
		Code:    strings.ToUpper(req.Service.Module) + "_" + "ASSIGNED_TO_ALL",
		Message:  " Assigned To All",
		Locale:  locale,
		Module:  localizationModule,
	}
	messages = append(messages, message) 
    message = model.Message{
		Code:    strings.ToUpper(req.Service.Module) + "_" + "COMMON_WORKFLOW_STATES",
		Message:  " Workflow States",
		Locale:  locale,
		Module:  localizationModule,
	}
	messages = append(messages, message)
	
	message = model.Message{
		Code:    strings.ToUpper(req.Service.Module) + "_" + "FILTER",
		Message:  " Filter",
		Locale:  locale,
		Module:  localizationModule,
	}
	messages = append(messages, message)
    message = model.Message{
		Code:    strings.ToUpper(req.Service.Module) + "_" + "COMMON_WARD",
		Message:  "  Ward",
		Locale:  locale,
		Module:  localizationModule,
	}
	messages = append(messages, message)

	message = model.Message{
		Code:    module + "_" + "APPLICATION_DETAILS",
		Message: "APPLICATION DETAILS",
		Locale:  locale,
		Module:  localizationModule,
	}
	messages = append(messages, message)
	message = model.Message{
		Code:    module + "_" + "APPLICANT_DETAILS",
		Message: "APPLICANTS DETAILS",
		Locale:  locale,
		Module:  localizationModule,
	}
	messages = append(messages, message)
	module= strings.ToUpper(req.Service.Module)
	field1 := []string{"APPLICATION_NUMBER", "STATUS", "TODATE", "FROMDATE", "BUSINESS_SERVICE"}
	for key := range field1 {
		message := model.Message{
			Code:    module + "_" + field1[key],
			Message: field1[key],
			Locale:  locale,
			Module:  localizationModule,
		}
		messages = append(messages, message)
	}

	field2 := map[string]string{
		"DOCUMENTS_ADDRESS_PROOF_UPLOAD":  "ADDRESS PROOF",
		"DOCUMENTS_IDENTITY_PROOF_UPLOAD": "IDENTITY PROOF",
		"DOCUMENTS_OWNER_PHOTO_DOWNLOAD":  "OWNER PHOTO",
		"DOCUMENTS_OWNER_PHOTO_UPLOAD":    "OWNER PHOTO",
	}

	for code, label := range field2 {
		message := model.Message{
			Code:    module + "_" + code,
			Message: label,
			Locale:  locale,
			Module:  localizationModule,
		}
		messages = append(messages, message)
	}
	logJSON("Localization Messages", messages)
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
			Code:    module + strings.ToUpper(req.Service.BusinessService) + "STATUS_" + key,
			Message: "Application Status: " + key,
			Locale:  locale,
			Module:  localizationModule,
		}
		messages = append(messages, message)
	}

	for key := range actionArr {
		message := model.Message{
			Code:    module + actionModule + key,
			Message: key,
			Locale:  locale,
			Module:  localizationModule,
		}
		messages = append(messages, message)
	}

	for key := range stateArr {
		message := model.Message{
			Code:    module + strings.ToUpper(req.Service.BusinessService) + "STATE_" + key,
			Message: "Current State: " + key,
			Locale:  locale,
			Module:  localizationModule,
		}
		messages = append(messages, message)
	}
	log.Println(messages)
	resp, err := l.SendLocalizationMessage(messages, req)
	log.Println(resp)
	log.Println(err)
}

func removeDuplicateCodes(messages []model.Message) []model.Message {
	seen := make(map[string]bool)
	var uniqueMessages []model.Message

	for _, message := range messages {
		if !seen[message.Code] {
			seen[message.Code] = true
			uniqueMessages = append(uniqueMessages, message)
		}
	}

	return uniqueMessages
}
func (l LocalizationService) ChecklistLocalization(data map[string]interface{}, req model.ServiceRequest) {
	var messages []model.Message
	locale := os.Getenv("NOTIFICATION_LOCALE")
	module := (req.Service.BusinessService)
	localizationModule := os.Getenv("LOCALIZATION_MODULE") + module

	// Extract checklist data
	checklists, exists := data["checklist"]
	if !exists {
		log.Println("No checklist data found")
		return
	}

	checklistArray, ok := checklists.([]interface{})
	if !ok {
		log.Println("Checklist data is not in expected array format")
		return
	}

	// Process each checklist item
	for _, checklistItem := range checklistArray {
		checklist := checklistItem.(map[string]interface{})

		// Extract state and checklist name
		state := checklist["state"].(string)
		checklistData := checklist["checklistData"].(map[string]interface{})
		checklistName := checklistData["name"].(string)

		// Extract questions data
		questionsData := checklistData["data"].([]interface{})

		// Process each question
		for _, questionItem := range questionsData {
			question := questionItem.(map[string]interface{})

			// Create localization for question title
			questionTitle := question["title"].(string)
			questionCode := module + "." + state + "." + checklistName + "." + questionTitle

			questionMessage := model.Message{
				Code:    questionCode,
				Message: questionTitle,
				Locale:  locale,
				Module:  localizationModule,
			}
			messages = append(messages, questionMessage)

			// Process options if they exist
			options, hasOptions := question["options"]
			if hasOptions {
				optionsArray := options.([]interface{})

				for _, optionItem := range optionsArray {
					option := optionItem.(map[string]interface{})

					// Create localization for option label
					optionLabel := option["label"].(string)
					optionCode := module + "." + state + "." + checklistName + "." + optionLabel

					optionMessage := model.Message{
						Code:    optionCode,
						Message: optionLabel,
						Locale:  locale,
						Module:  localizationModule,
					}
					messages = append(messages, optionMessage)
				}
			}
		}

		// Create localization for checklist name itself
		checklistNameCode := module + "." + state + "." + checklistName
		checklistNameMessage := model.Message{
			Code:    checklistNameCode,
			Message: checklistName,
			Locale:  locale,
			Module:  localizationModule,
		}
		messages = append(messages, checklistNameMessage)

		// Create localization for checklist description if it exists
		if description, hasDesc := checklistData["description"]; hasDesc {
			descriptionCode := module + "." + state + "." + checklistName + ".description"
			descriptionMessage := model.Message{
				Code:    descriptionCode,
				Message: description.(string),
				Locale:  locale,
				Module:  localizationModule,
			}
			messages = append(messages, descriptionMessage)
		}
	}

	log.Println("Generated checklist localization messages:")

	// Send localization messages
	resp, err := l.SendLocalizationMessage(messages, req)
	if err != nil {
		log.Printf("Error sending localization messages: %v", err)
	} else {
		log.Printf("Successfully sent localization messages: %v", resp)
	}
}
