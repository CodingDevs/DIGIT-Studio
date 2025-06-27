// utils/error.go (you can put this in a common util package)
package utils

import (
	"encoding/json"
	"net/http"
)

type CustomError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

func WriteErrorResponse(w http.ResponseWriter, statusCode int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(CustomError{
		Code:    statusCode,
		Message: message,
	})
}
