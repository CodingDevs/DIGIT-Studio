package model

import (
	"fmt"
	"github.com/go-playground/validator/v10"
)

type ModuleDetail struct {
	ModuleName    string         `json:"moduleName" validate:"required,max=256"`
	MasterDetails []MasterDetail `json:"masterDetails"` // Add `validate:"dive"` if individual validation is needed
}

// Builder pattern for ModuleDetail
type ModuleDetailBuilder struct {
	moduleName    string
	masterDetails []MasterDetail
}

func NewModuleDetailBuilder() *ModuleDetailBuilder {
	return &ModuleDetailBuilder{}
}

func (b *ModuleDetailBuilder) ModuleName(name string) *ModuleDetailBuilder {
	b.moduleName = name
	return b
}

func (b *ModuleDetailBuilder) MasterDetails(details []MasterDetail) *ModuleDetailBuilder {
	b.masterDetails = details
	return b
}

func (b *ModuleDetailBuilder) Build() (*ModuleDetail, error) {
	detail := &ModuleDetail{
		ModuleName:    b.moduleName,
		MasterDetails: b.masterDetails,
	}

	validate := validator.New()
	if err := validate.Struct(detail); err != nil {
		return nil, err
	}
	return detail, nil
}

func (m *ModuleDetail) String() string {
	return fmt.Sprintf("ModuleDetail(moduleName=%s, masterDetails=%v)", m.ModuleName, m.MasterDetails)
}
