package individual

import "public-service/model"

type IndividualRequest struct {
	RequestInfo model.RequestInfo `json:"RequestInfo"`
	Individual  Individual        `json:"Individual"`
}
