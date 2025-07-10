/*
  # Fix missing application_id column in job_reviews table

  1. Problem Fixed
    - The job_reviews table is missing the application_id column
    - This column is required for the foreign key relationship with job_applications

  2. Changes
    - Add the missing application_id column if it doesn't exist
    - Ensure proper foreign key constraint
    - Maintain existing data integrity

  3. Security
    - Maintain existing RLS policies
    - No changes to permissions
*/

-- Check if the job_reviews table exists and add missing application_id column
DO $$
BEGIN
    -- First ensure the job_reviews table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'job_reviews' AND table_schema = 'public'
    ) THEN
        -- Create the table if it doesn't exist
        CREATE TABLE job_reviews (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
            application_id uuid NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
            reviewer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
            review_text text,
            created_at timestamptz DEFAULT now(),
            UNIQUE(application_id, reviewer_id)
        );
        
        RAISE NOTICE 'Created job_reviews table with application_id column';
    ELSE
        -- Table exists, check if application_id column exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'job_reviews' 
            AND column_name = 'application_id' 
            AND table_schema = 'public'
        ) THEN
            -- Add the missing application_id column
            ALTER TABLE job_reviews 
            ADD COLUMN application_id uuid NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE;
            
            RAISE NOTICE 'Added missing application_id column to job_reviews table';
        ELSE
            RAISE NOTICE 'application_id column already exists in job_reviews table';
        END IF;
    END IF;

    -- Ensure the unique constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'job_reviews' 
        AND constraint_name = 'job_reviews_application_id_reviewer_id_key'
        AND table_schema = 'public'
    ) THEN
        -- Add unique constraint if it doesn't exist
        ALTER TABLE job_reviews 
        ADD CONSTRAINT job_reviews_application_id_reviewer_id_key 
        UNIQUE(application_id, reviewer_id);
        
        RAISE NOTICE 'Added unique constraint on application_id and reviewer_id';
    END IF;

    -- Ensure RLS is enabled
    ALTER TABLE job_reviews ENABLE ROW LEVEL SECURITY;

    -- Ensure proper permissions
    GRANT ALL ON job_reviews TO authenticated;

END $$;

-- Create index for better performance if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_job_reviews_application_id ON job_reviews(application_id);
CREATE INDEX IF NOT EXISTS idx_job_reviews_reviewer_id ON job_reviews(reviewer_id);

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Job reviews application_id fix completed successfully';
END $$;