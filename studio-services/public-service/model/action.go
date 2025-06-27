package model

// Action represents a workflow action.
type Action struct {
	UUID         string       `json:"uuid,omitempty" validate:"max=256"`
	TenantID     string       `json:"tenantId,omitempty" validate:"max=256"`
	CurrentState string       `json:"currentState,omitempty"`
	Action       string       `json:"action,omitempty"`
	NextState    string       `json:"nextState,omitempty"`
	Roles        []string     `json:"roles,omitempty"`
	AuditDetails AuditDetails `json:"auditDetails,omitempty"`
}

// AddRolesItem adds a role to the action's roles list.
func (a *Action) AddRolesItem(role string) {
	a.Roles = append(a.Roles, role)
}
