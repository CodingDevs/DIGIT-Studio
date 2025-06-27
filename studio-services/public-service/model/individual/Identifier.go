package individual

import "public-service/model"

type Identifier struct {
	ID                string              `json:"id,omitempty" validate:"omitempty,min=2,max=64"`
	ClientReferenceId string              `json:"clientReferenceId,omitempty" validate:"omitempty,min=2,max=64"`
	IndividualId      string              `json:"individualId,omitempty" validate:"omitempty,min=2,max=64"`
	IdentifierType    string              `json:"identifierType" validate:"required,min=2,max=64"`
	IdentifierId      string              `json:"identifierId" validate:"required,min=2,max=64"`
	IsDeleted         bool                `json:"isDeleted,omitempty"`
	AuditDetails      *model.AuditDetails `json:"auditDetails,omitempty" validate:"omitempty,dive"`
}
