package idgen

import "public-service/model"

type IdGenerationRequest struct {
	RequestInfo model.RequestInfo `json:"RequestInfo"`
	IdRequests  []IdRequest       `json:"idRequests" validate:"required,dive"`
}
