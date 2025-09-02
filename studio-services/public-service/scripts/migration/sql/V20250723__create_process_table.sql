CREATE TABLE IF NOT EXISTS public_service_process (
    id UUID PRIMARY KEY,
    process_name VARCHAR(255) NOT NULL,
    business_service VARCHAR(255) NOT NULL,
    module VARCHAR(255) NOT NULL,
    createdby VARCHAR(255) NOT NULL,
    created_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN NOT NULL,
    failureReason JSONB
);