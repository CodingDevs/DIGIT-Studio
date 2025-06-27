package model

type ResponseInfo struct {
	ApiId    string `json:"apiId"`
	Ver      string `json:"ver"`
	Ts       int    `json:"ts"`
	ResMsgId string `json:"resMsgId"`
	MsgId    string `json:"msgId"`
	Status   string `json:"status"`
	UserInfo User   `json:"UserInfo"`
}
