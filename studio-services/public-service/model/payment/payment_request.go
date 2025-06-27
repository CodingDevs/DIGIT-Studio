package payment

import "public-service/model"

type PaymentRequest struct {
	RequestInfo model.RequestInfo `json:"RequestInfo"`
	Payment     Payment     `json:"Payment"`
}
