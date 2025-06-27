package idgen

type IdRequest struct {
	IdName   string `json:"idName" validate:"required,max=200"`
	TenantId string `json:"tenantId" validate:"required,max=200"`
	Format   string `json:"format,omitempty" validate:"max=200"`
	Count    int    `json:"count,omitempty"`
}
