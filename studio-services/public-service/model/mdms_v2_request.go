package model

type MDMSV2Request struct {
	MdmsCriteria MdmsV2Criteria `json:"MdmsCriteria"`
	RequestInfo  RequestInfo    `json:"RequestInfo"`
}
