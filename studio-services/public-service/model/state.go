// State represents the basic data for a BPA workflow state.
package model

// State represents a state in the workflow
type State struct {
	UUID              string       `json:"uuid,omitempty" validate:"max=256"`
	TenantID          string       `json:"tenantId,omitempty" validate:"max=256"`
	BusinessServiceID string       `json:"businessServiceId,omitempty"`
	State             string       `json:"state,omitempty"`
	ApplicationStatus *string      `json:"applicationStatus,omitempty"`
	IsStartState      bool         `json:"isStartState,omitempty"`
	IsTerminateState  bool         `json:"isTerminateState,omitempty"`
	IsStateUpdatable  bool         `json:"isStateUpdatable,omitempty"`
	Actions           []Action     `json:"actions,omitempty" validate:"dive"`
	NextStates        []string     `json:"nextStates,omitempty"`
	DocUploadRequired bool         `json:"docUploadRequired,omitempty"`
	AuditDetails      AuditDetails `json:"auditDetails,omitempty"`
}

// AddActionsItem adds a new action to the state's actions list.
func (s *State) AddActionsItem(action Action) {
	s.Actions = append(s.Actions, action)
}
