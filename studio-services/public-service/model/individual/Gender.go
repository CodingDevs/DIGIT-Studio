package individual

import (
	"strings"
)

// Gender represents the gender enumeration.
type Gender string

const (
	GenderMale        Gender = "MALE"
	GenderFemale      Gender = "FEMALE"
	GenderOther       Gender = "OTHER"
	GenderTransgender Gender = "TRANSGENDER"
)

// UnmarshalJSON handles deserialization with case-insensitive matching.
func (g *Gender) UnmarshalJSON(b []byte) error {
	str := strings.Trim(string(b), `"`)
	switch strings.ToUpper(str) {
	case "MALE":
		*g = GenderMale
	case "FEMALE":
		*g = GenderFemale
	case "OTHER":
		*g = GenderOther
	case "TRANSGENDER":
		*g = GenderTransgender
	default:
		*g = ""
	}
	return nil
}

// MarshalJSON returns the string representation of the gender.
func (g Gender) MarshalJSON() ([]byte, error) {
	return []byte(`"` + string(g) + `"`), nil
}
