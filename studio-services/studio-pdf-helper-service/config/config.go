package config

import (
	"github.com/joho/godotenv"
	"log"
	"os"
)

func LoadEnv() {
	if os.Getenv("KUBERNETES_SERVICE_HOST") == "" {
		err := godotenv.Load()
		if err != nil {
			log.Println("⚠️ No .env file found or failed to load (probably running outside local)")
		} else {
			log.Println("✅ .env loaded successfully (local environment)")
		}
	} else {
		log.Println("⛔ Skipping .env load (Kubernetes environment)")
	}
}

// GetEnv safely gets the environment variable
func GetEnv(key string) string {
	return os.Getenv(key)
}
