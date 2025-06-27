package model

type MdmsV2Criteria struct {
	TenantID   string            `json:"tenantId"`
	Filters    map[string]string `json:"filters"`
	SchemaCode string            `json:"schemaCode"`
	Limit      int               `json:"limit"`
	Offset     int               `json:"offset"`
}
