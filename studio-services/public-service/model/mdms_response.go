package model

import (
	"encoding/json"
	"fmt"
)

// Placeholder for ResponseInfo, define fields as per your actual Java class

// MdmsResponse represents the structure of the response
type MdmsResponse struct {
	ResponseInfo ResponseInfo                        `json:"ResponseInfo"`
	MdmsRes      map[string]map[string][]interface{} `json:"MdmsRes"`
}

// Builder pattern for MdmsResponse
type MdmsResponseBuilder struct {
	responseInfo ResponseInfo
	mdmsRes      map[string]map[string][]interface{}
}

func NewMdmsResponseBuilder() *MdmsResponseBuilder {
	return &MdmsResponseBuilder{}
}

func (b *MdmsResponseBuilder) ResponseInfo(info ResponseInfo) *MdmsResponseBuilder {
	b.responseInfo = info
	return b
}

func (b *MdmsResponseBuilder) MdmsRes(data map[string]map[string][]interface{}) *MdmsResponseBuilder {
	b.mdmsRes = data
	return b
}

func (b *MdmsResponseBuilder) Build() *MdmsResponse {
	return &MdmsResponse{
		ResponseInfo: b.responseInfo,
		MdmsRes:      b.mdmsRes,
	}
}

func (r *MdmsResponse) String() string {
	bytes, err := json.Marshal(r)
	if err != nil {
		return fmt.Sprintf("MdmsResponse(responseInfo=%v, mdmsRes=%v)", r.ResponseInfo, r.MdmsRes)
	}
	return string(bytes)
}
