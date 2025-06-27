package model

import (
	"fmt"
	"github.com/go-playground/validator/v10"
)

// ModuleDetail should be defined elsewhere in your project.
// For illustration, a minimal placeholder is shown here.

type MdmsCriteria struct {
	TenantID      string         `json:"tenantId" validate:"required,max=256"`
	ModuleDetails []ModuleDetail `json:"moduleDetails" validate:"required,dive"` // assuming individual ModuleDetail validation
}

// MdmsCriteriaBuilder is used to build MdmsCriteria in a fluent way
type MdmsCriteriaBuilder struct {
	tenantID      string
	moduleDetails []ModuleDetail
}

func NewMdmsCriteriaBuilder() *MdmsCriteriaBuilder {
	return &MdmsCriteriaBuilder{}
}

func (b *MdmsCriteriaBuilder) TenantID(id string) *MdmsCriteriaBuilder {
	b.tenantID = id
	return b
}

func (b *MdmsCriteriaBuilder) ModuleDetails(details []ModuleDetail) *MdmsCriteriaBuilder {
	b.moduleDetails = details
	return b
}

func (b *MdmsCriteriaBuilder) Build() (*MdmsCriteria, error) {
	criteria := &MdmsCriteria{
		TenantID:      b.tenantID,
		ModuleDetails: b.moduleDetails,
	}

	validate := validator.New()
	if err := validate.Struct(criteria); err != nil {
		return nil, err
	}
	return criteria, nil
}

func (m *MdmsCriteria) String() string {
	return fmt.Sprintf("MdmsCriteria(tenantId=%s, moduleDetails=%v)", m.TenantID, m.ModuleDetails)
}
