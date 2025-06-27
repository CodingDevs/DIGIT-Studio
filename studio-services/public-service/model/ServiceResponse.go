package model

type ServiceResponse struct {
	ResponseInfo ResponseInfo `json:"responseInfo"`
	Services     []Service    `json:"Services"`
}
