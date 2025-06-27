package demand

import (
	"public-service/model"
)

type DemandRequest struct {
	RequestInfo model.RequestInfo `json:"RequestInfo"`
	Demands     []Demand          `json:"Demands"`
}
