package handlers

import (
	"encoding/json"
	"io"
	"net/http"
	"time"

	"studio-pdf-helper-service/kafka/producer"

	"github.com/google/uuid"
	"go.uber.org/zap"
)

type Handler struct {
	KafkaProducer *producer.PdfHelperServiceProducer
	Logger        *zap.Logger
}

func NewQRHandler(p *producer.PdfHelperServiceProducer, logger *zap.Logger) *Handler {
	return &Handler{
		KafkaProducer: p,
		Logger:        logger,
	}
}

func (h *Handler) GenerateQRHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Only POST method allowed", http.StatusMethodNotAllowed)
		return
	}

	body, err := io.ReadAll(r.Body)
	defer r.Body.Close()
	if err != nil {
		http.Error(w, "Error reading request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	var input map[string]interface{}
	if err := json.Unmarshal(body, &input); err != nil {
		http.Error(w, "Invalid JSON: "+err.Error(), http.StatusBadRequest)
		return
	}

	application, ok := input["Application"].(map[string]interface{})
	if !ok {
		http.Error(w, "Missing 'Application' in payload", http.StatusBadRequest)
		return
	}
	audit := application["auditDetails"].(map[string]interface{})

	payload := map[string]interface{}{
		"id":               uuid.New().String(),
		"data":             input,
		"createdBy":        getString(audit, "createdBy"),
		"modifiedBy":       getString(audit, "lastModifiedBy"),
		"createdTime":      getInt64(audit, "createdTime"),
		"lastModifiedTime": getInt64(audit, "lastModifiedTime"),
	}

	kafkaTopic := "studio.pdf.qr.mapping.create"
	payloadBytes, _ := json.Marshal(payload)

	if err := h.KafkaProducer.Push(r.Context(), kafkaTopic, payloadBytes); err != nil {
		h.Logger.Error("Failed to publish to Kafka", zap.Error(err))
		http.Error(w, "Kafka publish failed", http.StatusInternalServerError)
		return
	}

	h.Logger.Info("Successfully published QR mapping to Kafka", zap.String("id", payload["id"].(string)))

	w.WriteHeader(http.StatusAccepted)
	_ = json.NewEncoder(w).Encode(map[string]string{
		"status": "queued",
		"id":     payload["id"].(string),
	})

}

func getString(m map[string]interface{}, key string) string {
	if v, ok := m[key].(string); ok {
		return v
	}
	return ""
}

func getInt64(m map[string]interface{}, key string) int64 {
	if v, ok := m[key]; ok {
		switch val := v.(type) {
		case float64:
			return int64(val)
		case int:
			return int64(val)
		}
	}
	return time.Now().UnixMilli()
}
