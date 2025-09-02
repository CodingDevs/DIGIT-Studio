-- Add version column to service table if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='service' AND column_name='version'
    ) THEN
        ALTER TABLE service ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
END $$;

-- Add version column to application table if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='application' AND column_name='version'
    ) THEN
        ALTER TABLE application ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
END $$;

-- Create table: service_version_config_mapping
CREATE TABLE IF NOT EXISTS service_version_config_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_code VARCHAR(255) NOT NULL,
    version INTEGER NOT NULL,
    config JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_service_code FOREIGN KEY (service_code) REFERENCES service(service_code) ON DELETE CASCADE,
    CONSTRAINT uq_service_version UNIQUE (service_code, version)
);
