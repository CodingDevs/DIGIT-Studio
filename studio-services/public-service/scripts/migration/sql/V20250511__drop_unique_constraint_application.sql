-- Drop the old unique constraint if it exists
ALTER TABLE application
DROP CONSTRAINT IF EXISTS uniq_tenant_module_businessservice;

-- Add the new unique constraint only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uniq_service_code_application_number'
    ) THEN
ALTER TABLE application
    ADD CONSTRAINT uniq_service_code_application_number UNIQUE (service_code, application_number);
END IF;
END
$$;
