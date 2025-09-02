-- Create table: eg_service


CREATE TABLE IF NOT EXISTS service (
                                          id UUID PRIMARY KEY,
                                          tenant_id VARCHAR(255) NOT NULL,
    business_service VARCHAR(255) NOT NULL,
    module VARCHAR(255) NOT NULL,
    service_code VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(255),
    additional_details JSONB,
    createdby VARCHAR(255),
    last_modifiedby VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

--------------------------------------------------------------------------------------

-- Modified table: eg_applications
CREATE TABLE IF NOT EXISTS application (
                                               id UUID PRIMARY KEY,
                                               tenant_id VARCHAR(255) NOT NULL,
    module VARCHAR(255) NOT NULL,
    business_service VARCHAR(255) NOT NULL,
    status VARCHAR(255),
    channel VARCHAR(255),
    application_number VARCHAR(255),
    workflow_status VARCHAR(255),
    service_code VARCHAR(255),
    service_details JSONB,
    additional_details JSONB,
    address JSONB,
    workflow JSONB,
    createdby VARCHAR(255),
    last_modifiedby VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uniq_tenant_module_businessservice UNIQUE (tenant_id, module, business_service,service_code),
    CONSTRAINT fk_applications_service_code FOREIGN KEY (service_code) REFERENCES service(service_code)
    );

--------------------------------------------------------------------------------------

-- Table: eg_reference (unchanged)
CREATE TABLE IF NOT EXISTS reference (
                                            id UUID PRIMARY KEY,
                                            reference_type VARCHAR(255),
    module VARCHAR(255),
    tenant_id VARCHAR(255),
    reference_no VARCHAR(255),
    active BOOLEAN DEFAULT FALSE,
    application_id UUID,
    CONSTRAINT fk_reference_application FOREIGN KEY (application_id) REFERENCES application(id) ON DELETE CASCADE
    );

--------------------------------------------------------------------------------------

-- Table: eg_applicant (unchanged)
CREATE TABLE IF NOT EXISTS applicant (
                                            id UUID PRIMARY KEY,
                                            type VARCHAR(255),
    application_id UUID,
    user_id VARCHAR(255),
    name VARCHAR(255),
    mobile_number BIGINT,
    email_id VARCHAR(255),
    prefix VARCHAR(50),
    active BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_applicant_application FOREIGN KEY (application_id) REFERENCES application(id) ON DELETE CASCADE
    );
CREATE SEQUENCE IF NOT EXISTS service_code_sequence
    START WITH 1
    INCREMENT BY 1
    OWNED BY service.service_code;

CREATE SEQUENCE IF NOT EXISTS application_number_sequence
    START WITH 1
    INCREMENT BY 1
    OWNED BY application.application_number;