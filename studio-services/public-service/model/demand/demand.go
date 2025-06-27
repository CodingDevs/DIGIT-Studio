package demand

import (
	"encoding/json"
	"math/big"
	"public-service/model"
)

type StatusEnum string

const (
	StatusActive    StatusEnum = "ACTIVE"
	StatusCancelled StatusEnum = "CANCELLED"
	StatusAdjusted  StatusEnum = "ADJUSTED"
)

func (s *StatusEnum) UnmarshalJSON(data []byte) error {
	var statusStr string
	if err := json.Unmarshal(data, &statusStr); err != nil {
		return err
	}
	switch statusStr {
	case "ACTIVE":
		*s = StatusActive
	case "CANCELLED":
		*s = StatusCancelled
	case "ADJUSTED":
		*s = StatusAdjusted
	default:
		*s = StatusEnum(statusStr) // Unknown, but keep it
	}
	return nil
}

func (s StatusEnum) MarshalJSON() ([]byte, error) {
	return json.Marshal(string(s))
}

type Demand struct {
	ID                   string              `json:"id,omitempty"`
	TenantID             string              `json:"tenantId,omitempty"`
	ConsumerCode         string              `json:"consumerCode,omitempty"`
	ConsumerType         string              `json:"consumerType,omitempty"`
	BusinessService      string              `json:"businessService,omitempty"`
	Payer                *model.User         `json:"payer,omitempty"`
	TaxPeriodFrom        *int64              `json:"taxPeriodFrom,omitempty"`
	TaxPeriodTo          *int64              `json:"taxPeriodTo,omitempty"`
	DemandDetails        []DemandDetail      `json:"demandDetails,omitempty"`
	AuditDetails         *model.AuditDetails `json:"auditDetails,omitempty"`
	BillExpiryTime       *int64              `json:"billExpiryTime,omitempty"`
	AdditionalDetails    interface{}         `json:"additionalDetails,omitempty"`
	MinimumAmountPayable *big.Float          `json:"minimumAmountPayable,omitempty"`
	Status               StatusEnum          `json:"status,omitempty"`
}

func (d *Demand) AddDemandDetailsItem(item DemandDetail) {
	d.DemandDetails = append(d.DemandDetails, item)
}

func (d *Demand) UnmarshalJSON(data []byte) error {
	type Alias Demand
	aux := &struct {
		MinimumAmountPayable json.Number `json:"minimumAmountPayable"`
		*Alias
	}{
		Alias: (*Alias)(d),
	}

	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}

	if aux.MinimumAmountPayable != "" {
		floatVal, _, err := big.ParseFloat(aux.MinimumAmountPayable.String(), 10, 64, big.ToZero)
		if err != nil {
			return err
		}
		d.MinimumAmountPayable = floatVal
	}

	return nil
}
