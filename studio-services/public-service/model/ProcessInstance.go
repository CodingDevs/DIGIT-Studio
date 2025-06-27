package model

// ProcessInstance represents the instance of a workflow process.
type ProcessInstance struct {
	ID                 string       `json:"id,omitempty" validate:"max=64"`
	TenantID           string       `json:"tenantId" validate:"required,max=128"`
	BusinessService    string       `json:"businessService" validate:"required,max=128"`
	BusinessID         string       `json:"businessId" validate:"required,max=128"`
	Action             string       `json:"action" validate:"required,max=128"`
	ModuleName         string       `json:"moduleName" validate:"required,max=64"`
	State              *State       `json:"state,omitempty"`
	Comment            string       `json:"comment,omitempty"`
	Documents          []Document   `json:"documents,omitempty" validate:"dive"`
	Assigner           *User        `json:"assigner,omitempty"`
	Assignee           *User        `json:"assignee,omitempty"`
	NextActions        []Action     `json:"nextActions,omitempty" validate:"dive"`
	StateSLA           *int64       `json:"stateSla,omitempty"`
	BusinessServiceSLA *int64       `json:"businesssServiceSla,omitempty"`
	PreviousStatus     string       `json:"previousStatus,omitempty" validate:"max=128"`
	Entity             interface{}  `json:"entity,omitempty"`
	AuditDetails       AuditDetails `json:"auditDetails,omitempty"`
}

// AddDocumentsItem adds a document to the documents slice if not already present.
func (pi *ProcessInstance) AddDocumentsItem(doc Document) {
	for _, d := range pi.Documents {
		if d.ID == doc.ID {
			return
		}
	}
	pi.Documents = append(pi.Documents, doc)
}

// AddNextActionsItem adds a new action to the nextActions slice.
func (pi *ProcessInstance) AddNextActionsItem(action Action) {
	pi.NextActions = append(pi.NextActions, action)
}
