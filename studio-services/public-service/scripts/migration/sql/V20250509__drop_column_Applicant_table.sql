-- Alter table: applicant - drop columns name, mobile_number, email_id

-- Drop columns if they exist
ALTER TABLE applicant
    DROP COLUMN IF EXISTS name,
    DROP COLUMN IF EXISTS mobile_number,
    DROP COLUMN IF EXISTS email_id;

-- Add constraint if it does not already exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'uq_application_application_number' 
        AND table_name = 'application'
    ) THEN
        ALTER TABLE application 
            ADD CONSTRAINT uq_application_application_number UNIQUE (application_number);
    END IF;
END $$;

