package individual

import (
	"math/big"
	"time"
)

// IndividualSearch maps the Java class org.egov.common.models.individual.IndividualSearch
type IndividualSearch struct {
	IndividualId   []string    `json:"individualId,omitempty"`
	Name           *Name       `json:"name,omitempty"`
	DateOfBirth    *time.Time  `json:"dateOfBirth,omitempty"` // Expected format: dd/MM/yyyy (you can parse manually if needed)
	Gender         *Gender     `json:"gender,omitempty"`
	MobileNumber   []string    `json:"mobileNumber,omitempty"`
	SocialCategory string      `json:"socialCategory,omitempty"`
	WardCode       string      `json:"wardCode,omitempty"`
	IndividualName string      `json:"individualName,omitempty"`
	CreatedFrom    *big.Float  `json:"createdFrom,omitempty"`
	CreatedTo      *big.Float  `json:"createdTo,omitempty"`
	Identifier     *Identifier `json:"identifier,omitempty"`
	BoundaryCode   string      `json:"boundaryCode,omitempty"`
	RoleCodes      []string    `json:"roleCodes,omitempty"`
	Username       []string    `json:"username,omitempty"`
	UserId         []int64     `json:"userId,omitempty"`
	UserUuid       []string    `json:"userUuid,omitempty"`
	Latitude       *float64    `json:"latitude,omitempty"`     // range -90 to 90
	Longitude      *float64    `json:"longitude,omitempty"`    // range -180 to 180
	SearchRadius   *float64    `json:"searchRadius,omitempty"` // in kilometers
	Type           string      `json:"type,omitempty"`
}
