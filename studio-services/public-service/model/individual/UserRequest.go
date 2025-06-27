package individual

import (
	"public-service/model"
)

type UserRequest struct {
	RequestInfo model.RequestInfo `json:"request_info"`
	User        model.User        `json:"user"`
}
