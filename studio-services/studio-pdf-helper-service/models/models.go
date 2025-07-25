package models

import (
	"encoding/json"

	"github.com/google/uuid"
)

type UploadDataConfigRequest struct {
    RequestInfo RequestInfo     `json:"RequestInfo"`
    Key         string          `json:"key"`
    Service     string          `json:"service"`
    Module      string          `json:"module"`
    DataConfigs json.RawMessage `json:"DataConfigs"`
}
type UploadFormatConfigRequest struct {
    RequestInfo RequestInfo     `json:"RequestInfo"`
    Key         string          `json:"key"`
    Service     string          `json:"service"`
    Module      string          `json:"module"`
    Config      json.RawMessage `json:"config"`
}
type RequestInfo struct {
	ApiId       string `json:"apiId"`
	Ver         string `json:"ver"`
	Ts          int    `json:"ts"`
	Action      string `json:"action"`
	Did         string `json:"did"`
	Key         string `json:"key"`
	MsgId       string `json:"msgId"`
	RequesterId string `json:"requesterId"`
	AuthToken   string `json:"authToken"`
	UserInfo    *User  `json:"userInfo"`
}

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