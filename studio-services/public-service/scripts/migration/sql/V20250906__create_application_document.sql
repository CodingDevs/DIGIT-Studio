
CREATE TABLE IF NOT EXISTS application_document (
id UUID PRIMARY KEY,
application_number VARCHAR(255) NOT NULL,
document_type VARCHAR(255),
file_store_id VARCHAR(255),
document_uid VARCHAR(64),
additional_details JSONB,
createdby VARCHAR(255),
last_modifiedby VARCHAR(255),
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT fk_application_number FOREIGN KEY (application_number) REFERENCES application(application_number)
ON DELETE CASCADE
);

