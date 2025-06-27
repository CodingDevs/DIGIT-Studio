package individual

import "public-service/model"

type UserResponse struct {
	ResponseInfo model.ResponseInfo `json:"response_info"`
	Users        []Individual       `json:"users"`
}
