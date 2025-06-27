package sms

type SMSRequest struct {
	MobileNumber string   `json:"mobileNumber"`
	Message      string   `json:"message"`
	Category     Category `json:"category"`   // You’ll need to define the Category type
	ExpiryTime   int64    `json:"expiryTime"` // Long in Java maps to int64 in Go
	TenantID     string   `json:"tenantid"`
}
