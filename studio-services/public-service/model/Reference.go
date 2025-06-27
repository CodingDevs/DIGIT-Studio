package model

import "github.com/google/uuid"

type Reference struct {
	Id            uuid.UUID `json:"referenceId"`
	ReferenceType string    `json:"referenceType"`
	Module        string    `json:"module"`
	TenantId      string    `json:"tenantId"`
	ReferenceNo   string    `json:"referenceNo"`
	Active        bool      `json:"active"`
}
