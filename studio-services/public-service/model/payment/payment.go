package payment

import (
	"encoding/json"
	"public-service/model/demand"
)

type Payment struct {
	ID              string           `json:"id,omitempty"`
	TenantID        string           `json:"tenantId"`
	TotalDue        float64          `json:"totalDue,omitempty"`
	TotalAmountPaid float64          `json:"totalAmountPaid"`
	TransactionNumber string         `json:"transactionNumber,omitempty"`
	TransactionDate  int64           `json:"transactionDate,omitempty"`
	PaymentMode      string          `json:"paymentMode"`
	InstrumentDate   int64           `json:"instrumentDate,omitempty"`
	InstrumentNumber string          `json:"instrumentNumber,omitempty"`
	InstrumentStatus string          `json:"instrumentStatus,omitempty"`
	IFSCCode         string          `json:"ifscCode,omitempty"`
	AdditionalDetails json.RawMessage `json:"additionalDetails,omitempty"`
	PaymentDetails   []PaymentDetail `json:"paymentDetails,omitempty"`
	PaidBy           string          `json:"paidBy"`
	MobileNumber     string          `json:"mobileNumber,omitempty"`
	PayerName        string          `json:"payerName,omitempty"`
	PayerAddress     string          `json:"payerAddress,omitempty"`
	PayerEmail       string          `json:"payerEmail,omitempty"`
	PayerID          string          `json:"payerId,omitempty"`
	PaymentStatus    string          `json:"paymentStatus,omitempty"`
	FileStoreID      string          `json:"fileStoreId,omitempty"`
}

type PaymentDetail struct {
	ID                 string          `json:"id,omitempty"`
	PaymentID          string          `json:"paymentId,omitempty"`
	TenantID           string          `json:"tenantId"`
	TotalDue           float64      `json:"totalDue,omitempty"`
	TotalAmountPaid    float64      `json:"totalAmountPaid"`
	ReceiptNumber      string          `json:"receiptNumber,omitempty"`
	ManualReceiptNumber string         `json:"manualReceiptNumber,omitempty"`
	ManualReceiptDate  int64           `json:"manualReceiptDate,omitempty"`
	ReceiptDate        int64           `json:"receiptDate,omitempty"`
	ReceiptType        string          `json:"receiptType,omitempty"`
	BusinessService    string          `json:"businessService,omitempty"`
	BillID             string          `json:"billId"`
	Bill               demand.Bill           `json:"bill,omitempty"`
	AdditionalDetails  json.RawMessage `json:"additionalDetails,omitempty"`
}