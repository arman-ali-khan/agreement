/*
  # Fix missing application_id column in job_reviews table - Final Fix

  1. Problem Fixed
    - The job_reviews table exists but is missing the application_id column
    - Previous migrations may not have applied correctly
    - Need to ensure the column exists and has proper constraints

  2. Changes
    - Drop and recreate the job_reviews table with correct structure
    - Ensure all foreign key constraints are properly set
    - Maintain data integrity and RLS policies

  3. Security
    - Maintain existing RLS policies
    - Ensure proper permissions
*/

-- First, let's check the current structure and fix it
DO $$
DECLARE
    table_exists boolean;
    column_exists boolean;
BEGIN
    -- Check if job_reviews table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'job_reviews' AND table_schema = 'public'
    ) INTO table_exists;

    IF table_exists THEN
        -- Check if application_id column exists
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'job_reviews' 
            AND column_name = 'application_id' 
            AND table_schema = 'public'
        ) INTO column_exists;

        IF NOT column_exists THEN
            RAISE NOTICE 'Table exists but application_id column is missing. Dropping and recreating table.';
            
            -- Drop the table and recreate it with correct structure
            DROP TABLE IF EXISTS job_reviews CASCADE;
            
            -- Recreate with proper structure
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
            
            RAISE NOTICE 'Recreated job_reviews table with application_id column';
        ELSE
            RAISE NOTICE 'application_id column already exists in job_reviews table';
        END IF;
    ELSE
        -- Create the table from scratch
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
    END IF;
END $$;

-- Enable RLS
ALTER TABLE job_reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "job_reviews_select_policy" ON job_reviews;
DROP POLICY IF EXISTS "job_reviews_insert_policy" ON job_reviews;

-- Create RLS policies
CREATE POLICY "job_reviews_select_policy"
  ON job_reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "job_reviews_insert_policy"
  ON job_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM job_applications 
      WHERE job_applications.id = job_reviews.application_id 
      AND job_applications.status = 'accepted'
      AND (
        job_applications.applicant_id = auth.uid() 
        OR 
        EXISTS (
          SELECT 1 FROM jobs 
          WHERE jobs.id = job_applications.job_id 
          AND jobs.user_id = auth.uid()
        )
      )
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_job_reviews_job_id ON job_reviews(job_id);
CREATE INDEX IF NOT EXISTS idx_job_reviews_application_id ON job_reviews(application_id);
CREATE INDEX IF NOT EXISTS idx_job_reviews_reviewer_id ON job_reviews(reviewer_id);

-- Grant permissions
GRANT ALL ON job_reviews TO authenticated;

-- Recreate the trigger for updating job stats
DROP TRIGGER IF EXISTS update_job_reviews_stats ON job_reviews;
CREATE TRIGGER update_job_reviews_stats
  AFTER INSERT OR UPDATE OR DELETE ON job_reviews
  FOR EACH ROW EXECUTE FUNCTION update_job_stats();

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Job reviews application_id column fix completed successfully';
    
    -- Verify the table structure
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'job_reviews' 
        AND column_name = 'application_id' 
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE 'VERIFIED: application_id column now exists in job_reviews table';
    ELSE
        RAISE NOTICE 'ERROR: application_id column still missing from job_reviews table';
    END IF;
END $$;