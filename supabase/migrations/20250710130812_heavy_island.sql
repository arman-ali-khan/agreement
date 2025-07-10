/*
  # Fix response_time check constraint and enable draft saving

  1. Issues Fixed
    - Remove restrictive check constraint on response_time column
    - Allow any text value for response_time to support flexible options
    - Ensure jobs can be saved as drafts before publishing

  2. Changes
    - Drop existing response_time check constraint
    - Update jobs table to allow flexible response_time values
    - Ensure draft status works properly

  3. Security
    - Maintain existing RLS policies
    - No changes to permissions or access control
*/

-- Drop the restrictive response_time check constraint if it exists
DO $$
BEGIN
    -- Check if the constraint exists and drop it
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_name = 'jobs_response_time_check'
    ) THEN
        ALTER TABLE jobs DROP CONSTRAINT jobs_response_time_check;
        RAISE NOTICE 'Dropped restrictive response_time check constraint';
    END IF;
END $$;

-- Ensure response_time column allows any text value
ALTER TABLE jobs ALTER COLUMN response_time DROP NOT NULL;
ALTER TABLE jobs ALTER COLUMN response_time SET DEFAULT 'within 24 hours';

-- Update any null response_time values to a default
UPDATE jobs SET response_time = 'within 24 hours' WHERE response_time IS NULL;

-- Ensure the status column allows draft
DO $$
BEGIN
    -- Check if status constraint exists and update it
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_name = 'jobs_status_check'
    ) THEN
        ALTER TABLE jobs DROP CONSTRAINT jobs_status_check;
    END IF;
    
    -- Add updated status constraint that includes draft
    ALTER TABLE jobs ADD CONSTRAINT jobs_status_check 
    CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled'));
    
    RAISE NOTICE 'Updated status check constraint to include draft';
END $$;

-- Ensure default status is draft for new jobs
ALTER TABLE jobs ALTER COLUMN status SET DEFAULT 'draft';

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Response time constraint fix completed successfully';
    RAISE NOTICE 'Jobs can now be saved as drafts with flexible response times';
END $$;