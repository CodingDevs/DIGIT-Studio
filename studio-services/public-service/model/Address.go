package model

import "github.com/google/uuid"

type Address struct {
	Id            uuid.UUID `json:"id"`
	TenantId      string    `json:"tenantId"`
	Latitude      int       `json:"latitude"`
	Longitude     int       `json:"longitude"`
	AddressNumber string    `json:"addressNumber"`
	AddressLine1  string    `json:"addressLine1"`
	AddressLine2  string    `json:"addressLine2"`
	Landmark      string    `json:"landmark"`
	City          string    `json:"city"`
	Pincode       string    `json:"pincode"`
	Detail        string    `json:"detail"`
	HierarchyType string    `json:"hierarchyType"`
	Boundarylevel string    `json:"boundarylevel"`
	Boundarycode  string    `json:"boundarycode"`
}
