package model

type RequestInfo struct {
	ApiId       string `json:"apiId"`
	Ver         string `json:"ver"`
	Ts          int    `json:"ts"`
	Action      string `json:"action"`
	Did         string `json:"did"`
	Key         string `json:"key"`
	MsgId       string `json:"msgId"`
	RequesterId string `json:"requesterId"`
	AuthToken   string `json:"authToken"`
	UserInfo    *User  `json:"userInfo"`
}
