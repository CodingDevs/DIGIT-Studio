package demand

type BillResponse struct {
	ResponseInfo interface{} `json:"ResposneInfo"` // Typo in API? Should be ResponseInfo
	Bill         []Bill      `json:"Bill"`
}

type Bill struct {
	ID              string       `json:"id"`
	UserID          string       `json:"userId"`
	MobileNumber    string       `json:"mobileNumber"`
	PayerName       string       `json:"payerName"`
	Status          string       `json:"status"`
	TotalAmount     float64      `json:"totalAmount"`
	BusinessService string       `json:"businessService"`
	BillNumber      string       `json:"billNumber"`
	BillDate        int64        `json:"billDate"`
	ConsumerCode    string       `json:"consumerCode"`
	BillDetails     []BillDetail `json:"billDetails"`
	TenantId        string       `json:"tenantId"`
}

type BillDetail struct {
	ID                 string              `json:"id"`
	TenantId           string              `json:"tenantId"`
	DemandId           string              `json:"demandId"`
	BillId             string              `json:"billId"`
	ExpiryDate         int64               `json:"expiryDate"`
	Amount             float64             `json:"amount"`
	AmountPaid         *float64            `json:"amountPaid"`
	FromPeriod         int64               `json:"fromPeriod"`
	ToPeriod           int64               `json:"toPeriod"`
	BillAccountDetails []BillAccountDetail `json:"billAccountDetails"`
}

type BillAccountDetail struct {
	ID             string  `json:"id"`
	TenantId       string  `json:"tenantId"`
	BillDetailId   string  `json:"billDetailId"`
	DemandDetailId string  `json:"demandDetailId"`
	Order          int     `json:"order"`
	Amount         float64 `json:"amount"`
	AdjustedAmount float64 `json:"adjustedAmount"`
	TaxHeadCode    string  `json:"taxHeadCode"`
}
