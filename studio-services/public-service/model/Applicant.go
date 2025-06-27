package model

import "github.com/google/uuid"

type Applicant struct {
	Id           uuid.UUID `json:"id"`
	Type         string    `json:"type"`
	UserId       string    `json:"userId"`
	Name         string    `json:"name"`
	MobileNumber int64     `json:"mobileNumber"`
	EmailId      string    `json:"emailId"`
	Prefix       string    `json:"prefix"`
	Active       bool      `json:"active"`
}
