package model

import (
	"github.com/google/uuid"
)

type AuditDetails struct {
	CreatedBy        uuid.UUID `json:"createdBy"`
	LastModifiedBy   uuid.UUID `json:"lastModifiedBy"`
	CreatedTime      int64     `json:"createdTime"`
	LastModifiedTime int64     `json:"lastModifiedTime"`
}
