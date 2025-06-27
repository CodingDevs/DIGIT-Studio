package model

type ValidationResponse struct {
	Filters map[string]string
	DataArr []interface{}
	DataMap map[string]interface{}
	SchemaCode string
}