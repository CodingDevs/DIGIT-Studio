package repository

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
)

// RestCallRepository handles external REST API calls.
type RestCallRepository interface {
	Post(url string, requestBody interface{}, responseBody interface{}) error
}

type restCallRepositoryImpl struct {
	httpClient *http.Client
}

func NewRestCallRepository() RestCallRepository {
	return &restCallRepositoryImpl{
		httpClient: &http.Client{},
	}
}

// Post sends a POST request to the given URL with the provided request body and populates the responseBody.
func (r *restCallRepositoryImpl) Post(url string, requestBody interface{}, responseBody interface{}) error {
	reqBodyBytes, err := json.Marshal(requestBody)
	if err != nil {
		log.Printf("Error marshaling request body: %v", err)
		return fmt.Errorf("could not marshal request: %w", err)
	}

	req, err := http.NewRequest("POST", url, bytes.NewReader(reqBodyBytes))
	if err != nil {
		log.Printf("Error creating HTTP request: %v", err)
		return fmt.Errorf("could not create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := r.httpClient.Do(req)
	if err != nil {
		log.Printf("Error performing HTTP request: %v", err)
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("Error reading HTTP response body: %v", err)
		return fmt.Errorf("could not read response: %w", err)
	}

	if resp.StatusCode >= 400 {
		log.Printf("HTTP error response: %s", respBody)
		return fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(respBody))
	}

	if err := json.Unmarshal(respBody, &responseBody); err != nil {
		log.Printf("Error unmarshaling response body: %v", err)
		return fmt.Errorf("could not unmarshal response: %w", err)
	}

	return nil
}
