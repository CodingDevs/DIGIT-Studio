package main

import (
	"log"
	"net/http"
	"os"
	"public-service/config"
	"public-service/controller"
	"public-service/kafka/consumer"
	producer "public-service/kafka/producer"
	"public-service/repository"
	db "public-service/scripts"
	"public-service/service"
	"public-service/utils"
    "strings"
	"github.com/Priyansuvaish/digit_client/configdigit"

	"github.com/gorilla/mux"
	"github.com/segmentio/kafka-go"
)

func main() {
	utils.InitLogger()

	// Initialize the configuration
	mdmsHost := os.Getenv("MDMS_SERVICE_HOST")
	mdmsHost = strings.TrimSuffix(mdmsHost, "/")
	// Initialize the configuration
	configdigit.GetGlobalConfig().Initialize(
		mdmsHost,
		"",
	)
	// Load environment variables
	config.LoadEnv()

	// Initialize database connection
	dbConn := repository.InitDB()

	// Run DB migrations if enabled
	if os.Getenv("FLYWAY_ENABLED") == "true" {
		db.RunMigrations()
	}

	// Kafka producer setup
	writerFunc := func(topic string) *kafka.Writer {
		return kafka.NewWriter(kafka.WriterConfig{
			Brokers:  []string{config.GetEnv("KAFKA_BOOTSTRAP_SERVERS")},
			Topic:    topic,
			Balancer: &kafka.LeastBytes{},
		})
	}
	kafkaProducer := producer.NewPublicServiceProducer(writerFunc)

	// Initialize repositories
	publicRepo := repository.NewPublicRepository(dbConn,kafkaProducer)
	appRepo := repository.NewApplicationRepository(dbConn, publicRepo, kafkaProducer)
	restRepo := repository.NewRestCallRepository()

	// Initialize services
	
	individualSvc := service.NewIndividualService(restRepo)
	mdmsSvc := service.NewMDMSService(restRepo)
	mdmsv2sSvc := service.NewMDMSV2Service(restRepo,dbConn)
	idgenSvc := service.NewIdGenService(restRepo)
	demandSvc := service.NewDemandService(restRepo,mdmsv2sSvc)
	localizationService := service.NewLocalizationService(restRepo)
	serviceSvc := service.NewPublicService(publicRepo)
	workflowIntegrator := service.NewWorkflowIntegrator(mdmsv2sSvc)
	smsService := service.NewSMSService(restRepo, localizationService, kafkaProducer, demandSvc,workflowIntegrator,mdmsv2sSvc)
	enrichSvc := service.NewEnrichmentService(individualSvc, demandSvc, mdmsSvc, mdmsv2sSvc, idgenSvc, smsService)
	appSvc := service.NewApplicationService(appRepo, enrichSvc,workflowIntegrator)
	indexSvc := service.NewIndexerService(restRepo,kafkaProducer,workflowIntegrator,mdmsv2sSvc)

	


	// Start Kafka consumer in a separate goroutine if enabled
	if os.Getenv("KAFKA_PAYMENT_CONSUMER_ENABLED") == "true" {
		go consumer.ConsumePayments(workflowIntegrator, appSvc)
		log.Println("Kafka payment consumer started...")
	}

	// Initialize controllers
	appCtrl := controller.NewApplicationController(appSvc, workflowIntegrator, individualSvc, enrichSvc, smsService,indexSvc)
	serviceCtrl := controller.NewServiceController(serviceSvc,enrichSvc)

	// Setup router
	router := mux.NewRouter()

	// Service routes
	router.HandleFunc("/public-service/v1/service", serviceCtrl.CreateServiceHandler).Methods("POST")
	router.HandleFunc("/public-service/v1/service", serviceCtrl.SearchServiceHandler).Methods("GET")
	router.HandleFunc("/public-service/v1/service/{serviceCode}", serviceCtrl.UpdateServiceHandler).Methods("PUT")

	// Application routes
	router.HandleFunc("/public-service/v1/application/{serviceCode}", appCtrl.CreateApplicationHandler).Methods("POST")
	router.HandleFunc("/public-service/v1/application/{serviceCode}", appCtrl.SearchApplicationHandler).Methods("GET")
	router.HandleFunc("/public-service/v1/application/{serviceCode}", appCtrl.UpdateApplicationHandler).Methods("PUT")

	router.HandleFunc("/public-service/_calculate", appCtrl.CalculateHandler).Methods("POST")

	// Start HTTP server
	port := os.Getenv("SERVER_PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Server started at :%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, router))
}
