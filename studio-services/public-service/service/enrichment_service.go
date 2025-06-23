package service

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"math/big"
	"net/http"
	"os"
	"public-service/model"
	"public-service/model/demand"
	"public-service/model/individual"
	"strconv"
	"strings"

	"github.com/google/uuid"
)

type EnrichmentService struct {
	individualService *IndividualService
	DemandService     *DemandService
	MDMSService       *MDMSService
	MDMSV2Service     *MDMSV2Service
	IdGenService      *IdGenService
	SMSService        *SMSService
}

func NewEnrichmentService(individualService *IndividualService, demandService *DemandService, mdmsService *MDMSService, mdmsServiceV2 *MDMSV2Service, idGenService *IdGenService, smsService *SMSService) *EnrichmentService {
	return &EnrichmentService{individualService: individualService, DemandService: demandService, MDMSService: mdmsService, MDMSV2Service: mdmsServiceV2, IdGenService: idGenService, SMSService: smsService}
}

func (s *EnrichmentService) EnrichApplicationsWithIndividuals(apps []model.Application, criteria model.SearchCriteria) []model.Application {
	userCache := make(map[string]individual.Individual)

	for aIndex, app := range apps {
		for i, applicant := range app.Applicants {
			if applicant.UserId == "" {
				continue
			}
			if cached, ok := userCache[applicant.UserId]; ok {
				app.Applicants[i].Name = cached.Name.GivenName
				app.Applicants[i].MobileNumber, _ = strconv.ParseInt(cached.MobileNumber, 10, 64)
				app.Applicants[i].EmailId = cached.Email
				continue
			}
			criteria := map[string]interface{}{
				"uuid":     applicant.UserId,
				"tenantId": criteria.TenantId,
			}
			indResp := s.individualService.GetIndividual(model.RequestInfo{}, criteria)
			if jsonBytes, err := json.MarshalIndent(indResp, "", "  "); err == nil {
				log.Printf("Indiviual response:\n%s\n", string(jsonBytes))
			} else {
				log.Printf("Indiviual response (raw): %+v\n", indResp)
			}
			if len(indResp.Individual) > 0 {
				ind := indResp.Individual[0]
				userCache[applicant.UserId] = ind
				app.Applicants[i].Name = ind.Name.GivenName
				app.Applicants[i].MobileNumber, _ = strconv.ParseInt(ind.MobileNumber, 10, 64)
				app.Applicants[i].EmailId = ind.Email
			}
		}
		apps[aIndex] = app
	}

	return apps
}

func (s *EnrichmentService) EnrichApplicationsWithDemand(apps model.ApplicationRequest) (model.ApplicationRequest, error) {

	// Step 1: Extract generateDemandAt from MDMS and check if action is allowed
	schemaCode := os.Getenv("SERVICE_MODULE_NAME") + "." + os.Getenv("SERVICE_MASTER_NAME")
	filters := map[string]string{
        "service": apps.Application.BusinessService,
        "module":  apps.Application.Module,
    }
	mdmsData, _ := s.MDMSV2Service.SearchMDMS(
		apps.Application.TenantId,
		schemaCode,
		filters,
		apps.RequestInfo,
	)

	mdmsList, ok := mdmsData["mdms"].([]interface{})
	if !ok || len(mdmsList) == 0 {
		log.Println("MDMS data missing or invalid")
		return apps, errors.New("MDMS data missing or invalid")
	}

	firstEntry, _ := mdmsList[0].(map[string]interface{})
	data, _ := firstEntry["data"].(map[string]interface{})
	workflowData, ok := data["workflow"].(map[string]interface{})
	if !ok {
		log.Println("No 'workflow' section in MDMS")
		return apps, errors.New("No 'workflow' section in MDMS")
	}

	// Extract generateDemandAt array
	var generateDemandAtArray []string
	if gdaRaw, ok := workflowData["generateDemandAt"]; ok {
		if gdaList, ok := gdaRaw.([]interface{}); ok {
			for _, item := range gdaList {
				if str, ok := item.(string); ok {
					generateDemandAtArray = append(generateDemandAtArray, str)
				}
			}
		}
	}

	// Check if action is present in generateDemandAt array
	shouldGenerate := false
	for _, action := range generateDemandAtArray {
		if strings.EqualFold(action, apps.Application.Workflow.Action) {
			shouldGenerate = true
			break
		}
	}

	if !shouldGenerate {
		log.Printf("Action '%s' not in generateDemandAt: %+v", apps.Application.Workflow.Action, generateDemandAtArray)
		return apps, nil
	}

	// Step 2: Extract bill data
	billData, ok := data["bill"].(map[string]interface{})
	if !ok {
		log.Println("No 'bill' section in MDMS data")
		return apps, errors.New("No 'bill' section in MDMS data")
	}

	var businessService string
	if bsMap, ok := billData["BusinessService"].(map[string]interface{}); ok {
		if code, ok := bsMap["code"].(string); ok {
			businessService = code
		}
	}

	// Step 3: Get demand details
	demandDetails, err := s.GetCalculation(apps)
	if err != nil {
		return apps, err
	}

	// Step 4: Extract tax period
	var taxPeriodFrom, taxPeriodTo *int64
	if taxPeriods, ok := billData["taxPeriod"].([]interface{}); ok {
		for _, item := range taxPeriods {
			tp, _ := item.(map[string]interface{})
			if tp["service"] == businessService {
				if from, ok := tp["fromDate"].(float64); ok {
					fromInt := int64(from)
					taxPeriodFrom = &fromInt
				}
				if to, ok := tp["toDate"].(float64); ok {
					toInt := int64(to)
					taxPeriodTo = &toInt
				}
				break
			}
		}
	}

	// Step 5: Get Payer Info
	var payerUser model.User
	if len(apps.Application.Applicants) > 0 {
		individualId := apps.Application.Applicants[0].UserId
		criteria := map[string]interface{}{
			"uuid":     individualId,
			"tenantId": apps.Application.TenantId,
		}
		indResp := s.individualService.GetIndividual(model.RequestInfo{}, criteria)
		if len(indResp.Individual) > 0 {
			individual := indResp.Individual[0]
			parsedUUID, err := uuid.Parse(individual.UserUuid)
			if err != nil {
				log.Printf("Invalid UUID format for UserUuid: %v", err)
				return apps, errors.New("Invalid UUID format for UserUuid to enrich payer")
			}
			payerUser = model.User{
				Uuid:         parsedUUID,
				UserName:     individual.UserDetails.UserName,
				Name:         individual.Name.GivenName,
				MobileNumber: individual.MobileNumber,
				EmailId:      individual.Email,
				TenantId:     individual.TenantId,
				Type:         individual.UserDetails.Type,
			}
		}
	} else {
		log.Println("No applicants found to assign as payer")
	}

	// Step 6: Construct and save demand
	d := demand.Demand{
		ID:              uuid.NewString(),
		TenantID:        apps.Application.TenantId,
		ConsumerCode:    apps.Application.ApplicationNumber,
		ConsumerType:    apps.Application.Module,
		BusinessService: businessService,
		Payer:           &payerUser,
		TaxPeriodFrom:   taxPeriodFrom,
		TaxPeriodTo:     taxPeriodTo,
		DemandDetails:   demandDetails,
		AuditDetails:    nil,
	}

	createdDemands, err := s.DemandService.SaveDemand(apps.RequestInfo, []demand.Demand{d})
	if err != nil {
		log.Printf("Failed to save demand: %v", err)
		return apps, fmt.Errorf("Failed to save demand: %v", err)
	}
	logJSON("Saved Demands Response", createdDemands)

	return apps, nil
}


func logJSON(message string, data interface{}) {
	if jsonData, err := json.Marshal(data); err == nil {
		log.Printf(`{"message": "%s", "data": %s}`, message, jsonData)
	} else {
		log.Printf(`{"message": "%s", "error": "%v"}`, message, err)
	}
}

func (s *EnrichmentService) EnrichApplicationsWithIdGen(apps model.ApplicationRequest, typeOfApplication string) (model.ApplicationRequest, error) {
	schemaCode := os.Getenv("SERVICE_MODULE_NAME") + "." + os.Getenv("SERVICE_MASTER_NAME")
	filters := map[string]string{
        "service": apps.Application.BusinessService,
        "module":  apps.Application.Module,
    }
	mdmsData, _ := s.MDMSV2Service.SearchMDMS(
		apps.Application.TenantId,
		schemaCode,
		filters,
		apps.RequestInfo,
	)

	mdmsList, ok := mdmsData["mdms"].([]interface{})
	if !ok || len(mdmsList) == 0 {
		log.Println("MDMS data missing or invalid")
		return apps, errors.New("MDMS data missing or invalid")
	}

	var format string
	var name string
	firstEntry, ok := mdmsList[0].(map[string]interface{})
	if !ok {
		log.Println("Invalid MDMS format: first entry is not a map")
		return apps, errors.New("Invalid MDMS format: first entry is not a map")
	}

	data, ok := firstEntry["data"].(map[string]interface{})
	if !ok {
		log.Println("Invalid MDMS format: missing or invalid 'data'")
		return apps, errors.New("Invalid MDMS format: missing or invalid 'data'")
	}

	idGens, ok := data["idgen"].([]interface{})
	if !ok || len(idGens) == 0 {
		log.Println("No 'idgen' section in MDMS data")
		return apps, errors.New("No 'idgen' section in MDMS data")
	}

	for _, item := range idGens {
		idGen, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		idGenType, _ := idGen["type"].(string)

		// Use dynamic comparison
		if idGenType == typeOfApplication {
			format, _ = idGen["format"].(string)
			name, _ = idGen["idname"].(string)
			break
		}
	}

	// Validate if name and format were found
	if name == "" || format == "" {
		return apps, errors.New("id name or format is empty")
	}

	// Count should be at least 1
	ids, err := s.IdGenService.GetId(apps.RequestInfo, apps.Application.TenantId, name, format, 1)
	if err != nil {
		log.Printf("Error getting ID from IDGenService: %v", err)
		return apps, fmt.Errorf("error getting ID from IDGenService: %w", err)
	}
	if len(ids) > 0 {
		apps.Application.ApplicationNumber = ids[0]
	}

	return apps, nil
}

func (s *EnrichmentService) EnrichServiceWithIdGen(apps model.ServiceRequest, typeOfApplication string) (model.ServiceRequest, error) {
	schemaCode := os.Getenv("SERVICE_MODULE_NAME") + "." + os.Getenv("SERVICE_MASTER_NAME")
	filters := map[string]string{
        "service": apps.Service.BusinessService,
        "module":  apps.Service.Module,
    }
	mdmsData, _ := s.MDMSV2Service.SearchMDMS(
		apps.Service.TenantId,
		schemaCode,
		filters,
		apps.RequestInfo,
	)

	mdmsList, ok := mdmsData["mdms"].([]interface{})
	if !ok || len(mdmsList) == 0 {
		log.Println("MDMS data missing or invalid")
		return apps, errors.New("MDMS data missing or invalid")
	}

	var format string
	var name string
	firstEntry, ok := mdmsList[0].(map[string]interface{})
	if !ok {
		log.Println("Invalid MDMS format: first entry is not a map")
		return apps, errors.New("Invalid MDMS format: first entry is not a map")
	}

	data, ok := firstEntry["data"].(map[string]interface{})
	if !ok {
		log.Println("Invalid MDMS format: missing or invalid 'data'")
		return apps, errors.New("Invalid MDMS format: missing or invalid 'data'")
	}

	idGens, ok := data["idgen"].([]interface{})
	if !ok || len(idGens) == 0 {
		log.Println("No 'idgen' section in MDMS data")
		return apps, errors.New("No 'idgen' section in MDMS data")
	}
    
	for _, item := range idGens {
		idGen, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		idGenType, _ := idGen["type"].(string)

		// Use dynamic comparison
		if idGenType == typeOfApplication {
			format, _ = idGen["format"].(string)
			name, _ = idGen["idname"].(string)
			break
		}
	}

	// Validate if name and format were found
	if name == "" || format == "" {
		return apps, errors.New("id name or format is empty")
	}

	// Count should be at least 1
	ids, err := s.IdGenService.GetId(apps.RequestInfo, apps.Service.TenantId, name, format, 1)
	if err != nil {
		log.Printf("Error getting ID from IDGenService: %v", err)
		return apps, fmt.Errorf("error getting ID from IDGenService: %w", err)
	}
	if len(ids) > 0 {
		apps.Service.ServiceCode = ids[0]
	}
    _,err = s.MDMSV2Service.createMDMSActionTest(apps.Service.TenantId,apps.Service.ServiceCode,apps.RequestInfo)
	if err !=nil {
		return apps, fmt.Errorf("error creating MDMS for Action-test / role_mapping : %w", err)
	}
	return apps, nil
}

func (s *EnrichmentService) GetCalculation(apps model.ApplicationRequest) ([]demand.DemandDetail, error) {
	var demandDetails []demand.DemandDetail

	schemaCode := os.Getenv("SERVICE_MODULE_NAME") + "." + os.Getenv("SERVICE_MASTER_NAME")
	filters := map[string]string{
        "service": apps.Application.BusinessService,
        "module":  apps.Application.Module,
    }
	mdmsData, err := s.MDMSV2Service.SearchMDMS(
		apps.Application.TenantId,
		schemaCode,
		filters,
		apps.RequestInfo,
	)
	if err != nil {
		log.Println("Error fetching MDMS data:", err)
		return nil, err
	}

	mdmsList, ok := mdmsData["mdms"].([]interface{})
	if !ok || len(mdmsList) == 0 {
		return nil, errors.New("MDMS data missing or invalid")
	}

	firstEntry, _ := mdmsList[0].(map[string]interface{})
	data, _ := firstEntry["data"].(map[string]interface{})
	calculatorData, ok := data["calculator"].(map[string]interface{})
	if !ok {
		return nil, errors.New("No calculator data found in MDMS")
	}

	calcConf := calculatorData
	if !ok {
		return nil, errors.New("invalid calculator config format")
	}
	
	calcTypeRaw, ok := calcConf["type"].(string)
	if !ok {
		return nil, errors.New("missing calculator type")
	}
	calcType := strings.ToLower(calcTypeRaw)
	
	if calcType == "custom" {
		slabs, ok := calcConf["billingSlabs"].([]interface{})
		if !ok || len(slabs) == 0 {
			return nil, errors.New("no billingSlabs in custom calculator")
		}
	
		for _, slab := range slabs {
			slabData, ok := slab.(map[string]interface{})
			if !ok {
				continue
			}
	
			key, ok := slabData["key"].(string)
			if !ok {
				continue
			}
	
			var floatVal float64
			switch v := slabData["value"].(type) {
			case float64:
				floatVal = v
			case int:
				floatVal = float64(v)
			default:
				return nil, errors.New("unsupported value type for billing slab")
			}
	
			detail := demand.DemandDetail{
				ID:                uuid.NewString(),
				TaxHeadMasterCode: key,
				TaxAmount:         big.NewFloat(floatVal),
				CollectionAmount:  big.NewFloat(0.0),
				TenantID:          apps.Application.TenantId,
				AuditDetails:      nil,
			}
			demandDetails = append(demandDetails, detail)
	
			log.Printf("Using custom billing slab: %s = %v\n", key, floatVal)
		}
		return demandDetails, nil
	
	} else if calcType == "api" {
		// apiConf, ok := calcConf[calcType].(map[string]interface{})Add commentMore actions
		// if !ok {
		// 	return nil, errors.New("invalid or missing API config")
		// }

		hostStr, okHost := calcConf["host"].(string)
		endpoint, okEndpoint := calcConf["endpoint"].(string)
		methodStr, okMethod := calcConf["method"].(string)

		if !okHost || !okEndpoint || !okMethod {
			return nil, errors.New("invalid or missing API config")
		}

		hosts := strings.Split(hostStr, "||")
		method := strings.ToUpper(methodStr)
	
		var responseBody []byte
		var apiErr error
		for _, host := range hosts {
			url := strings.TrimSuffix(host, "/") + endpoint
			responseBody, apiErr = makeAPICall(url, method, apps)
			if apiErr == nil {
				log.Println("API call successful:", url)
				break
			}
			log.Printf("Failed API call to %s: %v", url, apiErr)
		}
	
		if apiErr != nil {
			return nil, fmt.Errorf("all API hosts failed: %w", apiErr)
		}
	
		var apiResponse map[string]interface{}
		err = json.Unmarshal(responseBody, &apiResponse)
		if err != nil {
			return nil, fmt.Errorf("error decoding API response: %w", err)
		}
	
		rawList, ok := apiResponse["demandDetails"].([]interface{})
		if !ok {
			return nil, errors.New("expected demandDetails as array in API response")
		}
	
		for _, rawItem := range rawList {
			item, ok := rawItem.(map[string]interface{})
			if !ok {
				continue
			}
	
			key, ok := item["taxhead"].(string)
			if !ok {
				continue
			}
	
			var floatVal float64
			switch v := item["amount"].(type) {
			case float64:
				floatVal = v
			case int:
				floatVal = float64(v)
			default:
				return nil, errors.New("unsupported taxAmount type in API response")
			}
	
			detail := demand.DemandDetail{
				ID:                uuid.NewString(),
				TaxHeadMasterCode: key,
				TaxAmount:         big.NewFloat(floatVal),
				CollectionAmount:  big.NewFloat(0.0),
				TenantID:          apps.Application.TenantId,
				AuditDetails:      nil,
			}
			demandDetails = append(demandDetails, detail)
		}
	
		log.Printf("Collected %d demand details from API\n", len(demandDetails))
		return demandDetails, nil
	}
	

	return nil, errors.New("no valid calculator config found")
}

// makeAPICall sends a POST/GET/etc request with the ApplicationRequest as JSON
func makeAPICall(url, method string, req model.ApplicationRequest) ([]byte, error) {
	jsonData, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("error marshalling request: %w", err)
	}

	request, err := http.NewRequest(method, url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("error creating HTTP request: %w", err)
	}

	request.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(request)
	if err != nil {
		return nil, fmt.Errorf("error making API request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API request failed: %s - %s", resp.Status, string(bodyBytes))
	}

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading response body: %w", err)
	}

	return responseBody, nil
}
