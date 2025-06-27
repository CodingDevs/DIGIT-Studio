package demand

import "public-service/model"

type DemandResponse struct {
	ResponseInfo model.ResponseInfo `json:"responseInfo"`
	Demands      []Demand           `json:"Demands"`
}
