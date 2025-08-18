package service

import (
	"log"
	"public-service/config"
	"public-service/model"
	"public-service/model/idgen"
	"public-service/repository"
)

type IdGenService struct {
	restCallRepo repository.RestCallRepository
}

func NewIdGenService(repo repository.RestCallRepository) *IdGenService {
	return &IdGenService{
		restCallRepo: repo,
	}
}

func (ser *IdGenService) GetId(requestInfo model.RequestInfo, tenantId, name, format string, count int) ([]string, error) {
	idRequests := make([]idgen.IdRequest, count)
	for i := 0; i < count; i++ {
		idRequests[i] = idgen.IdRequest{
			IdName:   name,
			Format:   format,
			TenantId: tenantId,
		}
	}

	reqBody := idgen.IdGenerationRequest{
		RequestInfo: requestInfo,
		IdRequests:  idRequests,
	}

	/*	jsonData, err := json.Marshal(reqBody)
		if err != nil {
			return nil, errors.Wrap(err, "failed to marshal IdGenerationRequest")
		}*/

	url := config.GetEnv("IDGEN_SERVICE_HOST") + config.GetEnv("IDGEN_SERVICE_GENERATE_URL")
	var idGenResp idgen.IdGenerationResponse
	err := ser.restCallRepo.Post(url, reqBody, &idGenResp)
	var ids []string
	if err != nil {
		log.Printf("Error calling create Idgen API: %v", err)
		return ids, err
	}
	for _, idResp := range idGenResp.IdResponses {
		ids = append(ids, idResp.Id)
	}

	return ids, nil
}
