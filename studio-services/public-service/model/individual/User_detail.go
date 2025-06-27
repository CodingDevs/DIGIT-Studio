package individual

type UserDetail struct {
	UserName string `json:"username,omitempty" validate:"omitempty,min=2,max=200"`
	TenantId string `json:"tenantId,omitempty" validate:"omitempty,min=2,max=200"`
	Roles    []struct {
		Name     string `json:"name"`
		Code     string `json:"code"`
		TenantId string `json:"tenantId"`
	} `json:"roles"`
	Type string `json:"type"`
}
