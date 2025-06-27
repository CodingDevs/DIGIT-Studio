package model

import "github.com/google/uuid"

type WorkFlow struct {
	Id        uuid.UUID   `json:"id"`
	Action    string      `json:"action"`
	BusinessService string  `json:"businessService"`
	Comment   string     `json:"comment"`
	Assignees []User     `json:"assignees"`
	Documents []Document `json:"documents"`
}
