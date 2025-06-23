package service

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"public-service/config"
	producer "public-service/kafka/producer"
	"public-service/model"
	"time"

	"github.com/google/uuid"
)

type ValidateService struct {
	db *sql.DB
	mdms_service *MDMSV2Service
	kafkaProducer *producer.PublicServiceProducer
	
	workflow_service *WorkflowService
	localization_service *LocalizationService
}

func NewValidateService(mdms_service *MDMSV2Service,  db *sql.DB, 
	kafkaProducer *producer.PublicServiceProducer, workflow_service *WorkflowService,
	localization_service *LocalizationService) *ValidateService{
	return &ValidateService{
		mdms_service: mdms_service,
		db: db,
		kafkaProducer: kafkaProducer,
		workflow_service: workflow_service,
		localization_service: localization_service,
	}
}

func (v ValidateService) Validate(ctx context.Context, req model.ServiceRequest) (bool, error) {
	tenantId := req.Service.TenantId
	business_service := req.Service.BusinessService
	module := req.Service.Module

	val, err := v.ValidateServices(tenantId, business_service, module, req)

	return val, err
}

func (v ValidateService) PersistData(service string, input model.Validation, success bool, err error){
	req := input.Req
	id := uuid.New()
    process_name := service
    createdby := req.UserInfo.Uuid
    created_time := time.Now()

	// log.Println(err)

	var failureReason []byte
	if err != nil {
		failureReason, _ = json.Marshal(map[string]interface{}{
    		"error": err.Error(), 
		})
	} else {
		failureReason, _ = json.Marshal(map[string]interface{}{
    		"error": "none", 
		})
	}

	log.Println(string(failureReason))
	err = v.db.QueryRow( `INSERT INTO public_service_process (id, process_name, business_service, module, createdby, created_time, success, failurereason) 
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`, id, process_name, input.Service, input.Module, createdby, created_time, success, failureReason).Scan(&id)
	if err != nil {
        log.Fatal("Insert failed:", err)
    }

	// payload := map[string]interface{}{
	// 	"id": id,
	// 	"process_name": process_name,
	// 	"businessService": business_service,
	// 	"module": module,
	// 	"createdBy": createdby,
	// 	"createdTime": created_time,
	// 	"success": success,
	// 	"failureReason": failureReason,
    // }

	// kafkaPayload, err := json.Marshal(payload)
	// if err != nil {
	// 	return false, fmt.Errorf("failed to marshal application request for Kafka: %w", err)
	// }

	// if v.kafkaProducer != nil {
	// 	log.Println("request", string(kafkaPayload))
	// 	err = v.kafkaProducer.Push(ctx, config.GetEnv("SAVE_PUBLIC_SERVICE_PROCESS"), kafkaPayload)
	// 	if err != nil {
	// 		log.Printf("failed to push kafka message: %v", err)
	// 		return false, err
	// 	}
	// } else {
	// 	return false, errors.New("kafka producer is not initialized")
	// }
}

func (v ValidateService) ValidateServices(tenantId string, business_service string, module string, req model.ServiceRequest) (bool, error) {

	envMap := config.GetEnv("MDMS_MAPPING")

	schemaCode := config.GetEnv("SERVICE_MODULE_NAME") + "." + config.GetEnv("SERVICE_MASTER_NAME")
	filters := map[string]string{
		"service": business_service, 
		"module": module, 
	}
	resp, _ := v.mdms_service.SearchMDMS(tenantId, schemaCode, filters, req.RequestInfo)
  
	mdmsList, ok := resp["mdms"].([]interface{})
	if !ok || len(mdmsList) == 0 {
		log.Println("MDMS data missing or invalid")
		return false, errors.New("MDMS data missing or invalid")
	}

	firstEntry, ok := mdmsList[0].(map[string]interface{})
	if !ok {
		log.Println("Invalid MDMS format: first entry is not a map")
		return false, errors.New("invalid MDMS format: first entry is not a map")
	}

	data, ok := firstEntry["data"].(map[string]interface{})
	if !ok {
		log.Println("Invalid MDMS format: missing or invalid 'data'")
		return false, errors.New("invalid MDMS format: missing or invalid 'data'")
	}

	var servicemap map[string]map[string]string
	err := json.Unmarshal([]byte(envMap), &servicemap)
	if err != nil {
		return false, err
	}

	funcMap := map[string]func(model.Validation) ([]model.ValidationResponse){
        "idgen":   v.IDgenValidation,
        "documents" : v.DocumentValidation,
		"bill" : v.BillValidation,
    }

	for service, value := range servicemap {
		log.Println(service + " validation")
		valueMap := value
		schemaCode := valueMap["schemaCode"]

		var (
			DataArr []interface{}
			DataMap map[string]interface{}
		)

		switch val := data[service].(type) {
		case []interface{}:
			DataArr = val
		case map[string]interface{}:
			DataMap = val
		default:
			log.Printf("Unsupported type for data[%q]: %T", service, data[service])
		}

		input := model.Validation{
			TenantId: tenantId,
			SchemaCode: schemaCode,
			Module: module,
			Service: business_service,
			DataArr: DataArr,
			DataMap: DataMap,
			Req: req.RequestInfo,
		}

		var result []model.ValidationResponse
		if fn, ok := funcMap[service]; ok {
			result = fn(input)
			if len(result) == 0  {
				log.Println("data does not exist")
				return false, err
			}
		} else {
			fmt.Println("Unknown functionName:", service)
		}

		// var missing []interface{}
		isFailure := false
		var error error
		for key := range result {
			val := result[key]
			resp, _ = v.mdms_service.SearchMDMS(tenantId, val.SchemaCode, val.Filters, req.RequestInfo)

			mdmsList, ok := resp["mdms"].([]interface{})
			if !ok || len(mdmsList) == 0 {
				// missing = append(missing, val)	

				resp, err = v.mdms_service.CreateMDMS(tenantId, val.SchemaCode, val.DataMap, req.RequestInfo)
				if err != nil {
					error = err
					log.Println("error creating data")
					isFailure = true
				}
				log.Println(resp)
			} 
		}

		if isFailure {
			v.PersistData(service, input, false, error)
		} else {
			v.PersistData(service, input, true, nil)
		}
	}

	input := model.Validation{
		TenantId: tenantId,
		SchemaCode: schemaCode,
		Module: module,
		Service: business_service,
		Req: req.RequestInfo,
	}

	resp1, _ :=  v.workflow_service.CreateAndValidateBusinessService(req)
	log.Println(resp1)
	if err != nil {
		v.PersistData("workflow", input, false, err)
		return false, err
	} else {
		v.PersistData("workflow", input, true, nil)
	}

	resp, err = v.localization_service.SendLocalizationMessage(req)
	if err != nil {
		log.Println(err)
	} else {
		log.Println(resp)
	}

	return true, nil
}

func (v ValidateService) DocumentValidation(input model.Validation) ([]model.ValidationResponse) {
	module := input.Module + "." + input.Service
	data := make(map[string]interface{})
	data["module"] = module
	var arr []interface{}
	for key := range input.DataArr {
		value := input.DataArr[key].(map[string]interface{})
		action := value["action"].([]interface{})
		actionValue := action[0]

		value["action"] = actionValue
		arr = append(arr, value)
	}
	data["actions"] = arr


	var resp []model.ValidationResponse
	resp = append(resp, 
		model.ValidationResponse{
			Filters: map[string]string{
				"module": module,
			},
			DataArr: input.DataArr,
			DataMap: data,
			SchemaCode: input.SchemaCode,
		},
	)
	return resp
}

func (v ValidateService) IDgenValidation(input model.Validation) ([]model.ValidationResponse) {
	var resp []model.ValidationResponse
    for _, item := range input.DataArr {
		if m, ok := item.(map[string]interface{}); ok {
			if val, ok := m["idname"].(string); ok {
				filters := map[string]string{
					"idname" : val,
				}
				resp = append(resp, 
					model.ValidationResponse{
						Filters: filters,
						DataArr: input.DataArr,
						DataMap: m,
						SchemaCode: input.SchemaCode,
					},
				)
			}
		}
	}

	return resp
}

func (v ValidateService) BillValidation(input model.Validation) ([]model.ValidationResponse) {
	data := input.DataMap
	TaxHead := data["taxHead"].([]interface{})
	TaxPeriod := data["taxPeriod"].([]interface{})
	BusinessService := data["BusinessService"].(map[string]interface{})
	// log.Println(BusinessService)

	var resp []model.ValidationResponse
	for key := range TaxHead {
		value := TaxHead[key].(map[string]interface{})
		resp = append(resp, 
			model.ValidationResponse{
				Filters: map[string]string{
					"code": value["code"].(string),
				},
				DataArr: input.DataArr,
				DataMap: value,
				SchemaCode: input.SchemaCode+"."+os.Getenv("TAXHEAD"),
			},
		)
	}

	for key := range TaxPeriod {
		value := TaxPeriod[key].(map[string]interface{})
		resp = append(resp, 
			model.ValidationResponse{
				Filters: map[string]string{
					"code": value["code"].(string),
				},
				DataArr: input.DataArr,
				DataMap: value,
				SchemaCode: input.SchemaCode+"."+os.Getenv("TAXPERIOD"),
			},
		)
	}

	resp = append(resp, 
			model.ValidationResponse{
				Filters: map[string]string{
					"code": BusinessService["code"].(string),
				},
				DataArr: input.DataArr,
				DataMap: BusinessService,
				SchemaCode: input.SchemaCode+"."+os.Getenv("BusinessService"),
			},
		)

	return resp
}

func (v ValidateService) WorkflowValidation(input model.Validation) (bool, error) {
	businessService, _ := input.DataMap["businessService"].(string)
	log.Println(businessService)

	var resp map[string]interface{}

	url := fmt.Sprintf("%s%s?businessServices=%s&tenantId=%s", config.GetEnv("WORKFLOW_HOST"), config.GetEnv("WORKFLOW_SERVICE_SEARCH_PATH"), businessService, input.TenantId)
	log.Println(url)
	err := v.mdms_service.restCallRepo.Post(url, input.Req, &resp)
	if err != nil {
		return false, err
	}
	workflow := resp["BusinessServices"].([]interface{})
	if len(workflow) == 0 {
		log.Println("No workflow")
		return false, fmt.Errorf("no workflow in MDMS")
	}

	log.Println("successfully getting workflow data")

	return true, nil
}