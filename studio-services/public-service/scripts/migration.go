package scripts

import (
	"database/sql"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"

	_ "github.com/lib/pq"
	"public-service/config" // 👈 import your config package
)

func RunMigrations() {
	// Load environment variables
	config.LoadEnv()

	dbUser := config.GetEnv("DB_USER")
	dbPassword := config.GetEnv("DB_PASSWORD")
	dbHost := config.GetEnv("DB_HOST")
	dbPort := config.GetEnv("DB_PORT")
	dbName := config.GetEnv("DB_NAME")

	// Build the database URL
	dbURL := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable", dbUser, dbPassword, dbHost, dbPort, dbName)

	// Connect to database
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to DB: %v", err)
	}
	defer db.Close()

	// Build the migrations folder path
	wd, err := os.Getwd()
	if err != nil {
		log.Fatal(err)
	}
	migrationsDir := filepath.Join(wd, "scripts/migration/sql")

	files, err := ioutil.ReadDir(migrationsDir)
	if err != nil {
		log.Fatalf("Could not read migrations directory: %v", err)
	}

	// Run each SQL file
	for _, file := range files {
		if !file.IsDir() && filepath.Ext(file.Name()) == ".sql" {
			filePath := filepath.Join(migrationsDir, file.Name())
			log.Printf("Running migration: %s", filePath)

			sqlBytes, err := ioutil.ReadFile(filePath)
			if err != nil {
				log.Fatalf("Could not read SQL file %s: %v", filePath, err)
			}

			sqlQuery := string(sqlBytes)

			_, err = db.Exec(sqlQuery)
			if err != nil {
				log.Fatalf("Migration failed for %s: %v", filePath, err)
			}

			log.Printf("Migration applied: %s", filePath)
		}
	}
}
