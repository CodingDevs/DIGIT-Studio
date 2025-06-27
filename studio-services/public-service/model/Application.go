package model

import "github.com/google/uuid"

type Application struct {
	Id                uuid.UUID              `json:"id"`
	TenantId          string                 `json:"tenantId"`
	Module            string                 `json:"module"`
	BusinessService   string                 `json:"businessService"`
	Status            Status                 `json:"status"`
	Channel           string                 `json:"channel"`
	ApplicationNumber string                 `json:"applicationNumber"` // ✅ corrected spelling
	Reference         []Reference            `json:"reference"`
	WorkflowStatus    string                 `json:"workflowStatus"` // ✅ only once, not duplicated
	ServiceCode       string                 `json:"serviceCode"`
	ServiceDetails    map[string]interface{} `json:"serviceDetails"` // ✅ correct jsonb field
	Applicants        []Applicant            `json:"applicants"`
	AdditionalDetails map[string]interface{} `json:"additionalDetails"` // ✅ correct jsonb field
	Address           Address                `json:"address"`
	Workflow          WorkFlow               `json:"workflow"`
	AuditDetails      AuditDetails           `json:"auditDetails"`
	ProcessInstance   *[]ProcessInstance     `json:"processInstance"`
	Documents         []Document             `json:"documents"`
}
