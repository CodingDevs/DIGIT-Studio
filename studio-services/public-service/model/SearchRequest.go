package model

type SearchRequest struct {
	RequestInfo    RequestInfo    `json:"RequestInfo"`
	SearchCriteria SearchCriteria `json:"SearchCriteria"`
}
