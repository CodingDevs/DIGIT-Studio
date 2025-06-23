-- Alter table: applicant - drop columns name, mobile_number, email_id

ALTER TABLE applicant
    DROP COLUMN IF EXISTS name,
    DROP COLUMN IF EXISTS mobile_number,
    DROP COLUMN IF EXISTS email_id;


DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_application_application_number'
        AND conrelid = 'application'::regclass
    ) THEN
ALTER TABLE application
    ADD CONSTRAINT uq_application_application_number UNIQUE (application_number);
END IF;
END
$$;
