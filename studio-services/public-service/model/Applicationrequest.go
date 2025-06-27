package model

type ApplicationRequest struct {
	RequestInfo RequestInfo `json:"RequestInfo"`
	Application Application `json:"Application"`
}
