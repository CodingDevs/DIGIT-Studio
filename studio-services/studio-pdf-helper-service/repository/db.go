package repository

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net"
	"os"

	_ "github.com/jackc/pgx/v5"
	"github.com/joho/godotenv"
)

func InitDB() *sql.DB {
	// Load .env locally, skip in Kubernetes
	if os.Getenv("KUBERNETES_SERVICE_HOST") == "" {
		err := godotenv.Load()
		if err != nil {
			log.Println("No .env file found (probably running in Kubernetes)")
		}
	}

	user := os.Getenv("DB_USER")
	password := os.Getenv("DB_PASSWORD")
	host := os.Getenv("DB_HOST")
	port := os.Getenv("DB_PORT")
	dbname := os.Getenv("DB_NAME")

	if user == "" || password == "" || host == "" || port == "" || dbname == "" {
		log.Fatal("Database environment variables are not set properly")
	}

	connStr := fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=require&connect_timeout=10",
		user, password, host, port, dbname,
	)

	// Force IPv4 resolution
	net.DefaultResolver.PreferGo = true
	net.DefaultResolver.Dial = func(ctx context.Context, network, address string) (net.Conn, error) {
		return net.Dial("tcp4", address)
	}

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal("Error while opening DB connection: ", err)
	}

	if err = db.Ping(); err != nil {
		log.Fatal("Database ping failed: ", err)
	}

	log.Println("✅ Database connected successfully!")
	return db
}
