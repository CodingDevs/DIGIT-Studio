package model

type SearchResponse struct {
	ResponseInfo ResponseInfo  `json:"responseInfo"`
	Application  []Application `json:"Application"`
}
