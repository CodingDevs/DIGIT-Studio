package model

type BusinessServiceRequest struct {
	RequestInfo     RequestInfo     `json:"RequestInfo"`
	BusinessServices []BusinessService `json:"BusinessServices"`
}
