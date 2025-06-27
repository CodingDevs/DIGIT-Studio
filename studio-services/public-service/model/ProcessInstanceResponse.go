package model

type ProcessInstanceResponse struct {
	RequestInfo      RequestInfo       `json:"RequestInfo"`
	ProcessInstances []ProcessInstance `json:"processInstances"`
}
