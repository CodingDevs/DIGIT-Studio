package model

type Status string

// Enum values for payment status
const (
	INACTIVE   Status = "INACTIVE"
	ACTIVE     Status = "ACTIVE"
	INWORKFLOW Status = "INWORKFLOW"
)
