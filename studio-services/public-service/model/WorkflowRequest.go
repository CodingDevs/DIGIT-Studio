package model

type WorkflowRequest struct {
	RequestInfo      RequestInfo       `json:"RequestInfo"`
	BusinessServices []BusinessService `json:"BusinessServices"`
}
