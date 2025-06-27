package model

type ServiceRequest struct {
	RequestInfo RequestInfo `json:"RequestInfo"`
	Service     Service     `json:"Service"`
}
