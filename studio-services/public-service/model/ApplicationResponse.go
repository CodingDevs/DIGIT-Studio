package model

type ApplicationResponse struct {
	ResponseInfo ResponseInfo `json:"responseInfo"`
	Application  Application  `json:"Application"`
}
