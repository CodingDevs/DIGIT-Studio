package model

type BusinessServiceResponse struct {
	ResponseInfo     ResponseInfo      `json:"ResponseInfo"`
	BusinessServices []BusinessService `json:"BusinessServices" validate:"required,dive"`
}
