package sms

import (
	"errors"
	"strings"
)

type Category string

const (
	CategoryOTP          Category = "OTP"
	CategoryTransaction  Category = "TRANSACTION"
	CategoryPromotion    Category = "PROMOTION"
	CategoryNotification Category = "NOTIFICATION"
	CategoryOthers       Category = "OTHERS"
)

// FromValue mimics @JsonCreator from Java
func CategoryFromValue(value string) (Category, error) {
	switch strings.ToUpper(value) {
	case "OTP":
		return CategoryOTP, nil
	case "TRANSACTION":
		return CategoryTransaction, nil
	case "PROMOTION":
		return CategoryPromotion, nil
	case "NOTIFICATION":
		return CategoryNotification, nil
	case "OTHERS":
		return CategoryOthers, nil
	default:
		return "", errors.New("invalid Category value: " + value)
	}
}

// ToString mimics @JsonValue
func (c Category) String() string {
	return string(c)
}
