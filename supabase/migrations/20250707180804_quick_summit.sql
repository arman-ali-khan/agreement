/*
  # Fix revisions_included column in jobs table

  1. Schema Fix
    - Ensure revisions_included column exists in jobs table
    - Set proper default value and constraints
    - Update any missing columns that might cause similar issues

  2. Data Integrity
    - Preserve existing data
    - Set sensible defaults for any null values
*/

-- Ensure the revisions_included column exists with proper definition
DO $$
BEGIN
  -- Check if revisions_included column exists, if not add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'revisions_included'
  ) THEN
    ALTER TABLE jobs ADD COLUMN revisions_included integer DEFAULT 0;
  END IF;

  -- Ensure the column has the correct type and default
  ALTER TABLE jobs ALTER COLUMN revisions_included SET DEFAULT 0;
  ALTER TABLE jobs ALTER COLUMN revisions_included SET NOT NULL;
  
  -- Update any null values to 0
  UPDATE jobs SET revisions_included = 0 WHERE revisions_included IS NULL;
END $$;

-- Ensure delivery_time column also has proper defaults
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'delivery_time'
  ) THEN
    ALTER TABLE jobs ALTER COLUMN delivery_time SET DEFAULT 7;
    UPDATE jobs SET delivery_time = 7 WHERE delivery_time IS NULL;
  END IF;
END $$;

-- Refresh the schema cache by updating a system table
-- This forces PostgREST to reload the schema
NOTIFY pgrst, 'reload schema';