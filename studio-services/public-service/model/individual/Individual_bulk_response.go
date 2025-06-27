package individual

import "public-service/model"

type IndividualBulkResponse struct {
	ResponseInfo model.ResponseInfo `json:"responseInfo"`
	Individual   []Individual       `json:"individual"`
}
