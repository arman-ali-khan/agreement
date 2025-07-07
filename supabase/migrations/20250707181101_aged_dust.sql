/*
  # Fix Job Creation Issues

  1. Issues Fixed
    - Handle existing policy conflicts
    - Ensure all required columns exist with proper defaults
    - Fix any missing permissions or constraints
    - Refresh schema cache for PostgREST

  2. Changes
    - Drop and recreate policies if they exist
    - Ensure all job-related tables have proper structure
    - Grant necessary permissions
    - Force schema cache refresh
*/

-- Handle policy conflicts by dropping existing policies first
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop existing policies on job_categories
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'job_categories' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON job_categories';
    END LOOP;

    -- Drop existing policies on jobs
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'jobs' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON jobs';
    END LOOP;

    -- Drop existing policies on job_skills
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'job_skills' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON job_skills';
    END LOOP;

    -- Drop existing policies on job_portfolio_items
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'job_portfolio_items' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON job_portfolio_items';
    END LOOP;

    -- Drop existing policies on job_packages
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'job_packages' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON job_packages';
    END LOOP;

    -- Drop existing policies on job_applications
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'job_applications' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON job_applications';
    END LOOP;

    -- Drop existing policies on job_reviews
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'job_reviews' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON job_reviews';
    END LOOP;
END $$;

-- Ensure all required columns exist with proper defaults
DO $$
BEGIN
    -- Check and fix revisions_included column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'jobs' AND column_name = 'revisions_included'
    ) THEN
        ALTER TABLE jobs ADD COLUMN revisions_included integer DEFAULT 0;
    END IF;

    -- Ensure proper defaults and constraints
    ALTER TABLE jobs ALTER COLUMN revisions_included SET DEFAULT 0;
    ALTER TABLE jobs ALTER COLUMN revisions_included SET NOT NULL;
    UPDATE jobs SET revisions_included = 0 WHERE revisions_included IS NULL;

    -- Check and fix delivery_time column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'jobs' AND column_name = 'delivery_time'
    ) THEN
        ALTER TABLE jobs ADD COLUMN delivery_time integer DEFAULT 7;
    END IF;

    ALTER TABLE jobs ALTER COLUMN delivery_time SET DEFAULT 7;
    UPDATE jobs SET delivery_time = 7 WHERE delivery_time IS NULL;

    -- Ensure other important columns have proper defaults
    ALTER TABLE jobs ALTER COLUMN status SET DEFAULT 'draft';
    ALTER TABLE jobs ALTER COLUMN featured SET DEFAULT false;
    ALTER TABLE jobs ALTER COLUMN views_count SET DEFAULT 0;
    ALTER TABLE jobs ALTER COLUMN applications_count SET DEFAULT 0;
    ALTER TABLE jobs ALTER COLUMN rating SET DEFAULT 0;
    ALTER TABLE jobs ALTER COLUMN reviews_count SET DEFAULT 0;
END $$;

-- Recreate policies for job_categories
CREATE POLICY "job_categories_select_policy"
  ON job_categories FOR SELECT
  TO authenticated
  USING (true);

-- Recreate policies for jobs
CREATE POLICY "jobs_select_policy"
  ON jobs FOR SELECT
  TO authenticated
  USING (status IN ('active', 'paused', 'completed') OR user_id = auth.uid());

CREATE POLICY "jobs_insert_policy"
  ON jobs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "jobs_update_policy"
  ON jobs FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "jobs_delete_policy"
  ON jobs FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Recreate policies for job_skills
CREATE POLICY "job_skills_select_policy"
  ON job_skills FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = job_skills.job_id 
      AND (jobs.status IN ('active', 'paused', 'completed') OR jobs.user_id = auth.uid())
    )
  );

CREATE POLICY "job_skills_all_policy"
  ON job_skills FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = job_skills.job_id 
      AND jobs.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = job_skills.job_id 
      AND jobs.user_id = auth.uid()
    )
  );

-- Recreate policies for job_portfolio_items
CREATE POLICY "job_portfolio_items_select_policy"
  ON job_portfolio_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = job_portfolio_items.job_id 
      AND (jobs.status IN ('active', 'paused', 'completed') OR jobs.user_id = auth.uid())
    )
  );

CREATE POLICY "job_portfolio_items_all_policy"
  ON job_portfolio_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = job_portfolio_items.job_id 
      AND jobs.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = job_portfolio_items.job_id 
      AND jobs.user_id = auth.uid()
    )
  );

-- Recreate policies for job_packages
CREATE POLICY "job_packages_select_policy"
  ON job_packages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = job_packages.job_id 
      AND (jobs.status IN ('active', 'paused', 'completed') OR jobs.user_id = auth.uid())
    )
  );

CREATE POLICY "job_packages_all_policy"
  ON job_packages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = job_packages.job_id 
      AND jobs.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = job_packages.job_id 
      AND jobs.user_id = auth.uid()
    )
  );

-- Recreate policies for job_applications
CREATE POLICY "job_applications_select_policy"
  ON job_applications FOR SELECT
  TO authenticated
  USING (
    applicant_id = auth.uid() 
    OR 
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = job_applications.job_id 
      AND jobs.user_id = auth.uid()
    )
  );

CREATE POLICY "job_applications_insert_policy"
  ON job_applications FOR INSERT
  TO authenticated
  WITH CHECK (applicant_id = auth.uid());

CREATE POLICY "job_applications_update_policy"
  ON job_applications FOR UPDATE
  TO authenticated
  USING (applicant_id = auth.uid())
  WITH CHECK (applicant_id = auth.uid());

-- Recreate policies for job_reviews
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

-- Ensure all tables have RLS enabled
ALTER TABLE job_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_reviews ENABLE ROW LEVEL SECURITY;

-- Grant all necessary permissions
GRANT ALL ON job_categories TO authenticated;
GRANT ALL ON jobs TO authenticated;
GRANT ALL ON job_skills TO authenticated;
GRANT ALL ON job_portfolio_items TO authenticated;
GRANT ALL ON job_packages TO authenticated;
GRANT ALL ON job_applications TO authenticated;
GRANT ALL ON job_reviews TO authenticated;

-- Ensure sequences are accessible
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Job creation fix migration completed successfully';
END $$;