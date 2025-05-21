package model

import (
	"fmt"
	"github.com/mitchellh/mapstructure"
)

type MDMSCreateV2Request struct {
	MDMS        Mdms        `json:"mdms"`
	RequestInfo RequestInfo `json:"RequestInfo"`
}

type Mdms struct {
	TenantID   string      `json:"tenantId"`
	SchemaCode string      `json:"schemaCode"`
	Data       interface{} `json:"data"` // Flexible field for multiple types
	IsActive   bool        `json:"isActive"`
}


// Schema Type: ACCESSCONTROL-ACTIONS-TEST.actions-test
type MdmsActionData struct {
	ID           int64  `json:"id"`
	URL          string `json:"url"`
	Code         string `json:"code"`
	Name         string `json:"name"`
	Path         string `json:"path"`
	Enabled      bool   `json:"enabled"`
	DisplayName  string `json:"displayName"`
	OrderNumber  int    `json:"orderNumber"`
	ServiceCode  string `json:"serviceCode"`
	ParentModule string `json:"parentModule"`
}

// Schema Type: ACCESSCONTROL-ROLEACTIONS.roleactions
type MdmsRoleActionData struct {
	RoleCode   string `json:"rolecode"`
	ActionID   string `json:"actionid"`
	ActionCode string `json:"actioncode"`
	TenantID   string `json:"tenantId"`
}

// Function to decode MDMS.Data into a specific struct based on SchemaCode
func DecodeMDMSData(mdms Mdms) (interface{}, error) {
	switch mdms.SchemaCode {
	case "ACCESSCONTROL-ACTIONS-TEST.actions-test":
		var actionData MdmsActionData
		err := mapstructure.Decode(mdms.Data, &actionData)
		return actionData, err

	case "ACCESSCONTROL-ROLEACTIONS.roleactions":
		var roleActionData MdmsRoleActionData
		err := mapstructure.Decode(mdms.Data, &roleActionData)
		return roleActionData, err

	default:
		return nil, fmt.Errorf("unsupported schema code: %s", mdms.SchemaCode)
	}
}
