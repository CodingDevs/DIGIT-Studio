package model

import (
	"fmt"
	"github.com/go-playground/validator/v10"
)

type MasterDetail struct {
	Name   string `json:"name" validate:"omitempty,max=256"`
	Filter string `json:"filter,omitempty"`
}

// MasterDetailBuilder provides a builder-style approach
type MasterDetailBuilder struct {
	name   string
	filter string
}

func NewMasterDetailBuilder() *MasterDetailBuilder {
	return &MasterDetailBuilder{}
}

func (b *MasterDetailBuilder) Name(name string) *MasterDetailBuilder {
	b.name = name
	return b
}

func (b *MasterDetailBuilder) Filter(filter string) *MasterDetailBuilder {
	b.filter = filter
	return b
}

func (b *MasterDetailBuilder) Build() (*MasterDetail, error) {
	detail := &MasterDetail{
		Name:   b.name,
		Filter: b.filter,
	}

	validate := validator.New()
	if err := validate.Struct(detail); err != nil {
		return nil, err
	}
	return detail, nil
}

func (m *MasterDetail) String() string {
	return fmt.Sprintf("MasterDetail(name=%s, filter=%s)", m.Name, m.Filter)
}
