package model

import "github.com/google/uuid"

type User struct {
	Id           int         `json:"id"`
	Uuid         uuid.UUID   `json:"uuid"`
	UserName     string      `json:"userName"`
	Name         string      `json:"name"`
	MobileNumber string      `json:"mobileNumber"`
	EmailId      string      `json:"emailId"`
	Locale       interface{} `json:"locale"`
	Type         string      `json:"type"`
	Roles        []struct {
		Name     string `json:"name"`
		Code     string `json:"code"`
		TenantId string `json:"tenantId"`
	} `json:"roles"`
	Active        bool        `json:"active"`
	TenantId      string      `json:"tenantId"`
	PermanentCity interface{} `json:"permanentCity"`
}
