package model

import "github.com/google/uuid"

type Service struct {
	ID                uuid.UUID              `json:"id"`
	TenantId          string                 `json:"tenantId"`
	BusinessService   string                 `json:"businessService"`
	Module            string                 `json:"module"`
	ServiceCode       string                 `json:"serviceCode"`
	Status            Status                 `json:"status"`
	AdditionalDetails map[string]interface{} `json:"additionalDetails"`
	AuditDetails      AuditDetails           `json:"auditDetails"`
}
