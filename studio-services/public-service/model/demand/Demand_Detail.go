package demand

import (
	"encoding/json"
	"math/big"
	"public-service/model"
)

type DemandDetail struct {
	ID                string              `json:"id,omitempty"`
	DemandID          string              `json:"demandId,omitempty"`
	TaxHeadMasterCode string              `json:"taxHeadMasterCode"` // required
	TaxAmount         *big.Float          `json:"taxAmount"`         // required
	CollectionAmount  *big.Float          `json:"collectionAmount"`  // required
	AuditDetails      *model.AuditDetails `json:"auditDetails,omitempty"`
	TenantID          string              `json:"tenantId,omitempty"`
}

// Custom unmarshaler to set default value for CollectionAmount if not provided
func (d *DemandDetail) UnmarshalJSON(data []byte) error {
	type Alias DemandDetail
	aux := &struct {
		TaxAmount        json.Number `json:"taxAmount"`
		CollectionAmount json.Number `json:"collectionAmount"`
		*Alias
	}{
		Alias: (*Alias)(d),
	}

	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}

	// Parse TaxAmount
	taxAmountFloat, _, err := big.ParseFloat(aux.TaxAmount.String(), 10, 64, big.ToZero)
	if err != nil {
		return err
	}
	d.TaxAmount = taxAmountFloat

	// Parse CollectionAmount
	collectionAmountFloat, _, err := big.ParseFloat(aux.CollectionAmount.String(), 10, 64, big.ToZero)
	if err != nil {
		return err
	}
	d.CollectionAmount = collectionAmountFloat

	return nil
}
