package main

import (
	"log"
	"net/http"
	"os"
	"studio-pdf-helper-service/config"
	"studio-pdf-helper-service/handlers"
	producer "studio-pdf-helper-service/kafka/producer"
	"studio-pdf-helper-service/repository"
	db "studio-pdf-helper-service/scripts"
	"time"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	"github.com/segmentio/kafka-go"
	"go.uber.org/zap"
)

func loadEnv() error {
	// Load .env file if it exists
	if err := godotenv.Load(); err != nil {
		// It's okay if .env doesn't exist, we'll use environment variables
		log.Printf("No .env file found: %v", err)
	}
	return nil
}

func main() {
	// Initialize logger
	logger, err := zap.NewProduction()
	if err != nil {
		log.Fatalf("Failed to initialize logger: %v", err)
	}
	defer logger.Sync()

	// Load environment variables
	if err := loadEnv(); err != nil {
		logger.Fatal("Failed to load environment variables", zap.Error(err))
	}
	// Initialize database connection
	DB :=repository.InitDB()

	// Run DB migrations if enabled
	if os.Getenv("FLYWAY_ENABLED") == "true" {
		db.RunMigrations()
	}

	// Read config for DevOps repo
	devopsRepoURL := getEnvWithDefault("DEVOPS_REPO_URL", "https://github.com/egovernments/DIGIT-DevOps.git")
	devopsRepoPath := getEnvWithDefault("DEVOPS_REPO_PATH", "./digit-devops")
	yamlFilePath := getEnvWithDefault("YAML_FILE_PATH", "./digit-devops/deploy-as-code/helm/environments/unified-dev.yaml")
	namespace := getEnvWithDefault("KUBERNETES_NAMESPACE", "default")

	// Read config for Config JSON repo
	configRepoURL := getEnvWithDefault("GITHUB_CONFIG_REPO_URL", "https://github.com/egovernments/configs")
	configRepoBranch := getEnvWithDefault("GITHUB_CONFIG_BRANCH", "UNIFIED-DEV")
	configBasePath := getEnvWithDefault("GITHUB_CONFIG_BASE_PATH", "pdf-service")

	// Then pass both sets to respective handlers
	configHandler, err := handlers.NewConfigHandler(
		devopsRepoURL,
		devopsRepoPath,
		yamlFilePath,
		namespace,
		configRepoURL,
		configRepoBranch,
		configBasePath,
		logger,
	)

	// Validate critical environment variables
	if os.Getenv("GITHUB_TOKEN") == "" {
		logger.Fatal("GITHUB_TOKEN environment variable is required")
	}

	if err != nil {
		logger.Fatal("Failed to initialize config handler", zap.Error(err))
	}
	// Kafka producer setup
	writerFunc := func(topic string) *kafka.Writer {
		return kafka.NewWriter(kafka.WriterConfig{
			Brokers:  []string{config.GetEnv("KAFKA_BOOTSTRAP_SERVERS")},
			Topic:    topic,
			Balancer: &kafka.LeastBytes{},
		})
	}
	kafkaProducer := producer.NewPdfHelperServiceProducer(writerFunc)
	qRHandler := handlers.NewQRHandler(kafkaProducer, logger, DB)

	router := mux.NewRouter()
	// Set up routes
	router.HandleFunc("/studio-pdf-helper/_data-config", configHandler.DataConfigHandler).Methods("POST")
	router.HandleFunc("/studio-pdf-helper/_format-config", configHandler.FormatConfigHandler).Methods("POST")
	router.HandleFunc("/studio-pdf-helper/_generateQR", qRHandler.GenerateQRHandler).Methods("POST")
	router.HandleFunc("/studio-pdf-helper/_scanQR", qRHandler.ScanQR).Methods("GET")
	port := getEnvWithDefault("PORT", "8080")

	server := &http.Server{
		Addr:         ":" + port,
        Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
	}

	logger.Info("Starting server", zap.String("port", port))
	if err := server.ListenAndServe(); err != nil {
		logger.Fatal("Server failed", zap.Error(err))
	}
}

func getEnvWithDefault(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
