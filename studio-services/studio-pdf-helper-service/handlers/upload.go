package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"studio-pdf-helper-service/github"
	"studio-pdf-helper-service/models"
	"studio-pdf-helper-service/services"

	"go.uber.org/zap"
)

type ConfigHandler struct {
	devopsService     *services.DevOpsConfigService
	kubernetesService *services.KubernetesService
	logger            *zap.Logger
}

func NewConfigHandler(
	devopsRepoURL, devopsRepoPath, yamlFilePath, namespace string,
	configRepoURL, configRepoBranch, configBasePath string, logger *zap.Logger,

) (*ConfigHandler, error) {

	// Initialize Kubernetes service
	kubeService, err := services.NewKubernetesService(namespace)
	if err != nil {
		return nil, fmt.Errorf("error initializing kubernetes service: %v", err)
	}

	return &ConfigHandler{
		devopsService:     services.NewDevOpsConfigService(devopsRepoURL, devopsRepoPath, yamlFilePath, os.Getenv("DEVOPS_REPO_BRANCH")),
		kubernetesService: kubeService,
		logger:            logger,
	}, nil
}

func (h *ConfigHandler) DataConfigHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	if r.Method != http.MethodPost {
		http.Error(w, "Only POST method allowed", http.StatusMethodNotAllowed)
		return
	}

	body, err := io.ReadAll(r.Body)
	defer r.Body.Close()
	if err != nil {
		http.Error(w, "Error reading request body", http.StatusInternalServerError)
		return
	}

	var req models.UploadDataConfigRequest
	if err := json.Unmarshal(body, &req); err != nil {
		http.Error(w, "Invalid request JSON", http.StatusBadRequest)
		return
	}

	if req.Key == "" || req.Module == "" || req.Service == "" {
		http.Error(w, "Missing key/module/service", http.StatusBadRequest)
		return
	}

	// Construct path: pdf-service/data-config-<service>-<module>-<key>.json
	fileName := fmt.Sprintf("%s-%s-%s.json", req.Service, req.Module, req.Key)
	// Full path inside the repo
	filePath := fmt.Sprintf("data-config/%s", fileName)

	// Wrap DataConfigs in full JSON structure
	var rawConfig json.RawMessage
	if err := json.Unmarshal(req.DataConfigs, &rawConfig); err != nil {
		http.Error(w, "Invalid DataConfigs JSON", http.StatusBadRequest)
		return
	}

	finalContent := map[string]any{
		"key":         req.Key,
		"DataConfigs": rawConfig,
	}

	contentBytes, err := json.MarshalIndent(finalContent, "", "  ")
	if err != nil {
		http.Error(w, "Failed to marshal final content", http.StatusInternalServerError)
		return
	}

	// Call GitHub upload logic
	if err := github.CreateOrUpdateFile(filePath, contentBytes); err != nil {
		http.Error(w, fmt.Sprintf("GitHub error: %v", err), http.StatusInternalServerError)
		return
	}

	if err := h.devopsService.UpdateConfigUrls(req.Service, req.Module, req.Key); err != nil {
		h.logger.Error("failed to update DevOps config", zap.Error(err))
		http.Error(w, fmt.Sprintf("DevOps config update error: %v", err), http.StatusInternalServerError)
		return
	}

	// Restart PDF service with retry and waiting for ready state

	if err := h.kubernetesService.RestartPDFServiceWithRetry(ctx, 3); err != nil {
		h.logger.Error("failed to restart PDF service", zap.Error(err))
		http.Error(w, fmt.Sprintf("Service restart error: %v", err), http.StatusInternalServerError)
		return
	}

	h.logger.Info("successfully completed configuration update and service restart")
	w.WriteHeader(http.StatusCreated)
	w.Write([]byte("File uploaded, config updated, and service restarted successfully"))
}

func (h *ConfigHandler) FormatConfigHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	if r.Method != http.MethodPost {
		http.Error(w, "Only POST method allowed", http.StatusMethodNotAllowed)
		return
	}

	body, err := io.ReadAll(r.Body)
	defer r.Body.Close()
	if err != nil {
		http.Error(w, "Error reading request body", http.StatusInternalServerError)
		return
	}

	var req models.UploadFormatConfigRequest // You'll need to define this struct in models
	if err := json.Unmarshal(body, &req); err != nil {
		http.Error(w, "Invalid request JSON", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if req.Key == "" || req.Module == "" || req.Service == "" {
		http.Error(w, "Missing key/module/service", http.StatusBadRequest)
		return
	}

	// Construct filename for format config
	fileName := fmt.Sprintf("%s-%s-%s.json", req.Service, req.Module, req.Key)
	filePath := fmt.Sprintf("format-config/%s", fileName)

	// Validate and process FormatConfigs
	var rawConfig json.RawMessage
	if err := json.Unmarshal(req.Config, &rawConfig); err != nil {
		http.Error(w, "Invalid FormatConfigs JSON", http.StatusBadRequest)
		return
	}

	// Create the final content structure
	finalContent := map[string]any{
		"key":    req.Key,
		"config": rawConfig,
	}

	// Convert to pretty-printed JSON
	contentBytes, err := json.MarshalIndent(finalContent, "", "  ")
	if err != nil {
		http.Error(w, "Failed to marshal final content", http.StatusInternalServerError)
		return
	}

	// Upload to GitHub
	if err := github.CreateOrUpdateFile(filePath, contentBytes); err != nil {
		http.Error(w, fmt.Sprintf("GitHub error: %v", err), http.StatusInternalServerError)
		return
	}

	if err := h.devopsService.UpdateConfigUrls(req.Service, req.Module, req.Key); err != nil {
		h.logger.Error("failed to update DevOps config", zap.Error(err))
		http.Error(w, fmt.Sprintf("DevOps config update error: %v", err), http.StatusInternalServerError)
		return
	}

	// Restart PDF service with retry and waiting for ready state
	if err := h.kubernetesService.RestartPDFServiceWithRetry(ctx, 3); err != nil {
		h.logger.Error("failed to restart PDF service", zap.Error(err))
		http.Error(w, fmt.Sprintf("Service restart error: %v", err), http.StatusInternalServerError)
		return
	}

	h.logger.Info("successfully completed configuration update and service restart")
	w.WriteHeader(http.StatusCreated)
	w.Write([]byte("File uploaded, config updated, and service restarted successfully"))
}
