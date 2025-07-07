/*
  # Fix Missing Columns in Jobs Table

  1. Problem
    - The jobs table is missing several required columns including 'rating'
    - Previous migrations assumed these columns existed
    - This causes errors when trying to set defaults

  2. Solution
    - Check for each required column and add it if missing
    - Set proper defaults and constraints
    - Ensure the table structure matches the expected schema

  3. Security
    - Maintain existing RLS policies
    - Ensure proper permissions
*/

-- Add missing columns to jobs table if they don't exist
DO $$
BEGIN
    -- Add rating column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'jobs' AND column_name = 'rating'
    ) THEN
        ALTER TABLE jobs ADD COLUMN rating decimal(3,2) DEFAULT 0;
        RAISE NOTICE 'Added rating column to jobs table';
    END IF;

    -- Add reviews_count column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'jobs' AND column_name = 'reviews_count'
    ) THEN
        ALTER TABLE jobs ADD COLUMN reviews_count integer DEFAULT 0;
        RAISE NOTICE 'Added reviews_count column to jobs table';
    END IF;

    -- Add views_count column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'jobs' AND column_name = 'views_count'
    ) THEN
        ALTER TABLE jobs ADD COLUMN views_count integer DEFAULT 0;
        RAISE NOTICE 'Added views_count column to jobs table';
    END IF;

    -- Add applications_count column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'jobs' AND column_name = 'applications_count'
    ) THEN
        ALTER TABLE jobs ADD COLUMN applications_count integer DEFAULT 0;
        RAISE NOTICE 'Added applications_count column to jobs table';
    END IF;

    -- Add featured column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'jobs' AND column_name = 'featured'
    ) THEN
        ALTER TABLE jobs ADD COLUMN featured boolean DEFAULT false;
        RAISE NOTICE 'Added featured column to jobs table';
    END IF;

    -- Add availability_hours column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'jobs' AND column_name = 'availability_hours'
    ) THEN
        ALTER TABLE jobs ADD COLUMN availability_hours jsonb;
        RAISE NOTICE 'Added availability_hours column to jobs table';
    END IF;

    -- Add response_time column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'jobs' AND column_name = 'response_time'
    ) THEN
        ALTER TABLE jobs ADD COLUMN response_time text;
        RAISE NOTICE 'Added response_time column to jobs table';
    END IF;

    -- Add updated_at column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'jobs' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE jobs ADD COLUMN updated_at timestamptz DEFAULT now();
        RAISE NOTICE 'Added updated_at column to jobs table';
    END IF;

    -- Add revisions_included column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'jobs' AND column_name = 'revisions_included'
    ) THEN
        ALTER TABLE jobs ADD COLUMN revisions_included integer DEFAULT 0;
        RAISE NOTICE 'Added revisions_included column to jobs table';
    END IF;

    -- Add delivery_time column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'jobs' AND column_name = 'delivery_time'
    ) THEN
        ALTER TABLE jobs ADD COLUMN delivery_time integer DEFAULT 7;
        RAISE NOTICE 'Added delivery_time column to jobs table';
    END IF;

    -- Add requirements column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'jobs' AND column_name = 'requirements'
    ) THEN
        ALTER TABLE jobs ADD COLUMN requirements text;
        RAISE NOTICE 'Added requirements column to jobs table';
    END IF;

    -- Add terms_conditions column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'jobs' AND column_name = 'terms_conditions'
    ) THEN
        ALTER TABLE jobs ADD COLUMN terms_conditions text;
        RAISE NOTICE 'Added terms_conditions column to jobs table';
    END IF;

    RAISE NOTICE 'All required columns have been checked and added if missing';
END $$;

-- Now set proper defaults and constraints for all columns
DO $$
BEGIN
    -- Set defaults for existing columns
    ALTER TABLE jobs ALTER COLUMN rating SET DEFAULT 0;
    ALTER TABLE jobs ALTER COLUMN reviews_count SET DEFAULT 0;
    ALTER TABLE jobs ALTER COLUMN views_count SET DEFAULT 0;
    ALTER TABLE jobs ALTER COLUMN applications_count SET DEFAULT 0;
    ALTER TABLE jobs ALTER COLUMN featured SET DEFAULT false;
    ALTER TABLE jobs ALTER COLUMN revisions_included SET DEFAULT 0;
    ALTER TABLE jobs ALTER COLUMN delivery_time SET DEFAULT 7;
    ALTER TABLE jobs ALTER COLUMN updated_at SET DEFAULT now();

    -- Update any null values to defaults
    UPDATE jobs SET rating = 0 WHERE rating IS NULL;
    UPDATE jobs SET reviews_count = 0 WHERE reviews_count IS NULL;
    UPDATE jobs SET views_count = 0 WHERE views_count IS NULL;
    UPDATE jobs SET applications_count = 0 WHERE applications_count IS NULL;
    UPDATE jobs SET featured = false WHERE featured IS NULL;
    UPDATE jobs SET revisions_included = 0 WHERE revisions_included IS NULL;
    UPDATE jobs SET delivery_time = 7 WHERE delivery_time IS NULL;
    UPDATE jobs SET updated_at = now() WHERE updated_at IS NULL;

    -- Set NOT NULL constraints where appropriate
    ALTER TABLE jobs ALTER COLUMN rating SET NOT NULL;
    ALTER TABLE jobs ALTER COLUMN reviews_count SET NOT NULL;
    ALTER TABLE jobs ALTER COLUMN views_count SET NOT NULL;
    ALTER TABLE jobs ALTER COLUMN applications_count SET NOT NULL;
    ALTER TABLE jobs ALTER COLUMN featured SET NOT NULL;
    ALTER TABLE jobs ALTER COLUMN revisions_included SET NOT NULL;
    ALTER TABLE jobs ALTER COLUMN updated_at SET NOT NULL;

    RAISE NOTICE 'All column defaults and constraints have been set';
END $$;

-- Ensure the jobs table has proper check constraints
DO $$
BEGIN
    -- Add check constraint for pricing_type if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_name = 'jobs_pricing_type_check'
    ) THEN
        ALTER TABLE jobs ADD CONSTRAINT jobs_pricing_type_check 
        CHECK (pricing_type IN ('hourly', 'fixed', 'package'));
    END IF;

    -- Add check constraint for status if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_name = 'jobs_status_check'
    ) THEN
        ALTER TABLE jobs ADD CONSTRAINT jobs_status_check 
        CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled'));
    END IF;

    RAISE NOTICE 'Check constraints have been verified';
END $$;

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Missing columns fix migration completed successfully';
    
    -- Log the current structure of the jobs table
    RAISE NOTICE 'Jobs table now has the following columns:';
    FOR rec IN 
        SELECT column_name, data_type, column_default, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'jobs' AND table_schema = 'public'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  %: % (default: %, nullable: %)', 
            rec.column_name, rec.data_type, rec.column_default, rec.is_nullable;
    END LOOP;
END $$;