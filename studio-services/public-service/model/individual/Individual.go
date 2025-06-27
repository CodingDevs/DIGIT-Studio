package individual

type Individual struct {
	Id                 string       `json:"id,omitempty"`
	IndividualId       string       `json:"individualId,omitempty" validate:"omitempty,min=2,max=64"`
	UserId             string       `json:"userId,omitempty"`
	TenantId           string       `json:"tenantId,omitempty"`
	UserUuid           string       `json:"userUuid,omitempty"`
	Name               *Name        `json:"name" validate:"required"`
	DateOfBirth        string       `json:"dateOfBirth,omitempty"`
	Gender             *Gender      `json:"gender,omitempty"`
	MobileNumber       string       `json:"mobileNumber,omitempty" validate:"max=20"`
	AltContactNumber   string       `json:"altContactNumber,omitempty" validate:"max=16"`
	Email              string       `json:"email,omitempty" validate:"omitempty,min=5,max=200"`
	FatherName         string       `json:"fatherName,omitempty" validate:"max=100"`
	HusbandName        string       `json:"husbandName,omitempty" validate:"max=100"`
	Relationship       string       `json:"relationship,omitempty" validate:"min=1,max=100"`
	Identifiers        []Identifier `json:"identifiers,omitempty"`
	Photo              string       `json:"photo,omitempty"`
	IsDeleted          bool         `json:"isDeleted,omitempty"`
	IsSystemUser       bool         `json:"isSystemUser,omitempty"`
	IsSystemUserActive bool         `json:"isSystemUserActive,omitempty"`
	UserDetails        *UserDetail  `json:"userDetails,omitempty"`
}

type Name struct {
	GivenName  string `json:"givenName,omitempty" validate:"omitempty,min=2,max=200"`
	FamilyName string `json:"familyName,omitempty" validate:"omitempty,min=2,max=200"`
	OtherNames string `json:"otherNames,omitempty" validate:"max=200"`
}
