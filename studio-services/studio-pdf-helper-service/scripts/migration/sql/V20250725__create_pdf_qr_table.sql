-- V20250725__create_pdf_qr_table.sql

CREATE TABLE IF NOT EXISTS pdf_qr_mapping (
    id UUID PRIMARY KEY,
    data JSONB NOT NULL,
    createdby TEXT,
    modifiedby TEXT,
    createdtime BIGINT,
    lastmodifiedtime BIGINT
);
