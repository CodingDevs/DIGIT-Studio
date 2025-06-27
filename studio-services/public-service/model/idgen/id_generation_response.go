package idgen

import "public-service/model"

type IdGenerationResponse struct {
	ResponseInfo model.ResponseInfo `json:"responseInfo"`
	IdResponses  []IdResponse       `json:"idResponses"`
}
