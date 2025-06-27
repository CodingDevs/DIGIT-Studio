package model

type Localization struct {
	RequestInfo RequestInfo `json:"RequestInfo"`
	TenantID   string      `json:"tenantId"`
	Messages  []Message   `json:"messages"`
}

type Message struct {
	Code string      `json:"code"`
	Message string `json:"message"` 
	Module   string `json:"module"`
	Locale string  `json:"locale"`
}