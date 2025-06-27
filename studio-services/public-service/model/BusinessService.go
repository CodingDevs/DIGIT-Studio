package model

import "strings"

// BusinessService holds workflow details for a business process.
type BusinessService struct {
	TenantID           string       `json:"tenantId,omitempty" validate:"max=256"`
	UUID               string       `json:"uuid,omitempty" validate:"max=256"`
	BusinessService    string       `json:"businessService,omitempty" validate:"max=256"`
	Business           string       `json:"business,omitempty" validate:"max=256"`
	GetURI             string       `json:"getUri,omitempty" validate:"max=1024"`
	PostURI            string       `json:"postUri,omitempty" validate:"max=1024"`
	BusinessServiceSLA *int64       `json:"businessServiceSla,omitempty"`
	States             []State      `json:"states" validate:"required,dive"` // NotNull in Java -> `required` in Go
	AuditDetails       AuditDetails `json:"auditDetails,omitempty"`
}

// AddStatesItem appends a state to the BusinessService.
func (bs *BusinessService) AddStatesItem(state State) {
	bs.States = append(bs.States, state)
}

// GetStateFromUUID returns the state that matches the given UUID, or nil if not found.
func (bs *BusinessService) GetStateFromUUID(uuid string) *State {
	for _, s := range bs.States {
		if strings.EqualFold(s.UUID, uuid) {
			return &s
		}
	}
	return nil
}
