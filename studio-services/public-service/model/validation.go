package model

type Validation struct {
	TenantId string
	Module string
	Service string
	DataArr []interface{} 
	DataMap map[string]interface{}
 	SchemaCode string 
	Req RequestInfo
}