package sms

import "public-service/model"


type EmailRequest struct {
	RequestInfo model.RequestInfo `json:"requestInfo"`
	Email       Email       `json:"email"`
}


type Email struct {
	EmailTo     []string          `json:"emailTo"`     // using slice instead of Set
	Subject     string            `json:"subject"`
	Body        string            `json:"body"`
	FileStoreId map[string]string `json:"fileStoreId"`
	TenantId    string            `json:"tenantId"`
	IsHTML      bool              `json:"isHTML"`
}