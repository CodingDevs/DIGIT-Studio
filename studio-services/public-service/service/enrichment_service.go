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

func (s *EnrichmentService) EnrichApplicationsWithDemand(apps model.ApplicationRequest) model.ApplicationRequest {
	if apps.Application.Workflow.Action == "VERIFY_AND_FORWARD" {
		schemaCode := os.Getenv("SERVICE_MODULE_NAME") + "." + os.Getenv("SERVICE_MASTER_NAME")
		mdmsData, _ := s.MDMSV2Service.SearchMDMS(
			apps.Application.TenantId,
			schemaCode,
			apps.Application.BusinessService,
			apps.Application.Module,
			apps.RequestInfo,
		)

		mdmsList, ok := mdmsData["mdms"].([]interface{})
		if !ok || len(mdmsList) == 0 {
			log.Println("MDMS data missing or invalid")
			return apps
		}

		firstEntry, _ := mdmsList[0].(map[string]interface{})
		data, _ := firstEntry["data"].(map[string]interface{})
		billData, ok := data["bill"].(map[string]interface{})
		if !ok {
			log.Println("No 'bill' section in MDMS data")
			return apps
		}

		// Step 2: Extract taxHeadCode from bill.taxHead
		var taxHeadCode string
		if taxHeads, ok := billData["taxHead"].([]interface{}); ok {
			for _, item := range taxHeads {
				taxHead, _ := item.(map[string]interface{})
				if taxHead["service"] == apps.Application.BusinessService && taxHead["code"] == "TL_TAX" {
					taxHeadCode = taxHead["code"].(string)
					break
				}
			}
		}
		if taxHeadCode == "" {
			log.Println("No matching taxHeadCode found, defaulting")
			taxHeadCode = "TL_TAX"
		}

		// Step 3: Extract taxPeriodFrom and taxPeriodTo from bill.taxPeriod
		var taxPeriodFrom, taxPeriodTo *int64
		if taxPeriods, ok := billData["taxPeriod"].([]interface{}); ok {
			for _, item := range taxPeriods {
				tp, _ := item.(map[string]interface{})
				if tp["service"] == apps.Application.BusinessService {
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

		// Step 4: Extract businessService from bill.BusinessService
		var businessService string
		if bsMap, ok := billData["BusinessService"].(map[string]interface{}); ok {
			if code, ok := bsMap["code"].(string); ok {
				businessService = code
			}

		}
		if businessService == "" {
			businessService = apps.Application.BusinessService // fallback
		}
		var payerUser model.User // Replace with your actual User struct type
		if len(apps.Application.Applicants) > 0 {
			individualId := apps.Application.Applicants[0].UserId // Assuming this exists

			// Fetch individual/user details using the ID
			criteria := map[string]interface{}{
				"uuid":     individualId,
				"tenantId": apps.Application.TenantId,
			}
			indResp := s.individualService.GetIndividual(model.RequestInfo{}, criteria)
			if jsonBytes, err := json.MarshalIndent(indResp, "", "  "); err == nil {
				log.Printf("Indiviual response:\n%s\n", string(jsonBytes))
			} else {
				log.Printf("Indiviual response (raw): %+v\n", indResp)
			}

			if len(indResp.Individual) > 0 {
				// Map individual data to User (Payer)
				individual := indResp.Individual[0]

				parsedUUID, err := uuid.Parse(individual.UserUuid)
				if err != nil {
					log.Printf("Invalid UUID format for UserUuid: %v", err)
					return apps
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
		demandDetail := demand.DemandDetail{
			ID:                uuid.NewString(),
			TaxHeadMasterCode: taxHeadCode,
			TaxAmount:         big.NewFloat(50.0),
			CollectionAmount:  big.NewFloat(0.0),
			TenantID:          apps.Application.TenantId,
			AuditDetails:      nil,
		}

		d := demand.Demand{
			ID:              uuid.NewString(),
			TenantID:        apps.Application.TenantId,
			ConsumerCode:    apps.Application.ApplicationNumber,
			ConsumerType:    apps.Application.Module,
			BusinessService: businessService,
			Payer:           &payerUser,
			TaxPeriodFrom:   taxPeriodFrom,
			TaxPeriodTo:     taxPeriodTo,
			DemandDetails:   []demand.DemandDetail{demandDetail},
			AuditDetails:    nil,
		}
		var demands []demand.Demand
		demands = append(demands, d)

		createdDemands, err := s.DemandService.SaveDemand(apps.RequestInfo, demands)
		if err != nil {
			log.Printf("Failed to save demand: %v", err)
		} else {
			logJSON("Saved Demands Response", createdDemands)
			_, err2 := s.SMSService.SendSMS(apps, apps.Application.TenantId, "DIGIT_STUDIO_DEMAND_CREATED", apps.Application.Applicants)
			if err2 != nil {
				log.Printf("Failed to send SMS: %v", err2)
			}

		}

		// Optional: attach the demand to the application if needed
	}

	return apps
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
	mdmsData, _ := s.MDMSV2Service.SearchMDMS(
		apps.Application.TenantId,
		schemaCode,
		apps.Application.BusinessService,
		apps.Application.Module,
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
	mdmsData, _ := s.MDMSV2Service.SearchMDMS(
		apps.Service.TenantId,
		schemaCode,
		apps.Service.BusinessService,
		apps.Service.Module,
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
	mdmsData, err := s.MDMSV2Service.SearchMDMS(
		apps.Application.TenantId,
		schemaCode,
		apps.Application.BusinessService,
		apps.Application.Module,
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

	for _, v := range calculatorData {
		calcConf, _ := v.(map[string]interface{})
		calcTypeRaw, ok := calcConf["type"].(string)
		if !ok {
			continue
		}
		calcType := strings.ToLower(calcTypeRaw)

		if calcType == "custom" {
			slabs, ok := calcConf["billingSlabs"].([]interface{})
			if !ok || len(slabs) == 0 {
				return nil, errors.New("No billingSlabs in custom calculator")
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
					return nil, errors.New("Unsupported value type for billing slab")
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
			apiConf, ok := calcConf["api"].(map[string]interface{})
			if !ok {
				return nil, errors.New("invalid or missing API config")
			}

			hosts := strings.Split(apiConf["host"].(string), "||")
			endpoint := apiConf["endpoint"].(string)
			method := strings.ToUpper(apiConf["method"].(string))

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

			// Example API response decoding
			var apiResponse map[string]interface{}
			err = json.Unmarshal(responseBody, &apiResponse)
			if err != nil {
				return nil, fmt.Errorf("error decoding API response: %w", err)
			}

			// Expecting array of demandDetails: apiResponse["demandDetails"] = [{...}, {...}]
			rawList, ok := apiResponse["demandDetails"].([]interface{})
			if !ok {
				return nil, errors.New("expected demandDetails as array in API response")
			}

			for _, rawItem := range rawList {
				item, ok := rawItem.(map[string]interface{})
				if !ok {
					continue
				}

				key, ok := item["taxHeadCode"].(string)
				if !ok {
					continue
				}

				var floatVal float64
				switch v := item["taxAmount"].(type) {
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
