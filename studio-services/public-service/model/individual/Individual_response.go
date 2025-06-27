package individual

import "public-service/model"

type IndividualResponse struct {
	ResponseInfo model.ResponseInfo `json:"responseInfo"`
	Individual   Individual         `json:"individual"`
}
