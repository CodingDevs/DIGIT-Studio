package handlers

import (
	"database/sql"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"time"

	"studio-pdf-helper-service/kafka/producer"

	"github.com/google/uuid"
	"go.uber.org/zap"
)

type Handler struct {
	KafkaProducer *producer.PdfHelperServiceProducer
	Logger        *zap.Logger
	DB            *sql.DB
}

func NewQRHandler(p *producer.PdfHelperServiceProducer, logger *zap.Logger, db *sql.DB) *Handler {
	return &Handler{
		KafkaProducer: p,
		Logger:        logger,
		DB:            db,
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

	kafkaTopic := os.Getenv("SAVE_PDF_QR_GENERATOR")
	payloadBytes, _ := json.Marshal(payload)

	if err := h.KafkaProducer.Push(r.Context(), kafkaTopic, payloadBytes); err != nil {
		h.Logger.Error("Failed to publish to Kafka", zap.Error(err))
		http.Error(w, "Kafka publish failed", http.StatusInternalServerError)
		return
	}

	h.Logger.Info("Successfully published QR mapping to Kafka", zap.String("id", payload["id"].(string)))

	w.WriteHeader(http.StatusAccepted)
	w.Header().Set("Content-Type", "application/json")	
	_ = json.NewEncoder(w).Encode(map[string]string{
		"status": "queued",
		"id":     payload["id"].(string),
	})

}

func (h *Handler) ScanQR(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	pdfID := r.URL.Query().Get("pdf-id")
	if pdfID == "" {
		http.Error(w, "Missing query param: pdf-id", http.StatusBadRequest)
		return
	}

	// Validate UUID
	_, err := uuid.Parse(pdfID)
	if err != nil {
		http.Error(w, "Invalid pdf-id format", http.StatusBadRequest)
		return
	}

	// Query for full row including metadata
	query := `
		SELECT data, createdby, modifiedby, createdtime, lastmodifiedtime
		FROM pdf_qr_mapping
		WHERE id = $1
	`

	var (
		dataBytes                      []byte
		createdBy, modifiedBy          sql.NullString
		createdTime, lastModifiedTime sql.NullInt64
	)

	err = h.DB.QueryRowContext(r.Context(), query, pdfID).Scan(
		&dataBytes, &createdBy, &modifiedBy, &createdTime, &lastModifiedTime,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "No record found for given pdf-id", http.StatusNotFound)
			return
		}
		h.Logger.Error("Failed to query pdf_qr_mapping", zap.Error(err))
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Parse JSONB `data` field
	var data map[string]interface{}
	if err := json.Unmarshal(dataBytes, &data); err != nil {
		h.Logger.Error("Failed to unmarshal data JSON", zap.Error(err))
		http.Error(w, "Invalid stored data format", http.StatusInternalServerError)
		return
	}

	// Construct full response
	res := map[string]interface{}{
		"data":             data,
		"createdBy":        createdBy.String,
		"modifiedBy":       modifiedBy.String,
		"createdTime":      createdTime.Int64,
		"lastModifiedTime": lastModifiedTime.Int64,
	}
    w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
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
