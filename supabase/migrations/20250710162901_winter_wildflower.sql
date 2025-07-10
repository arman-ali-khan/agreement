/*
  # Fix job schema policy conflicts

  1. Problem Fixed
    - Job schema migration conflicts with existing policies
    - Tables may exist but policies are conflicting
    - Need to handle existing policies gracefully

  2. Changes
    - Drop existing policies if they exist
    - Recreate all job-related tables with IF NOT EXISTS
    - Recreate policies with proper conflict handling
    - Ensure all required indexes and permissions

  3. Security
    - Maintain proper RLS policies
    - Ensure authenticated users have correct access
*/

-- Handle policy conflicts by dropping existing policies first
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop existing policies on job_categories if they exist
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'job_categories' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON job_categories';
    END LOOP;

    -- Drop existing policies on jobs if they exist
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'jobs' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON jobs';
    END LOOP;

    -- Drop existing policies on job_skills if they exist
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'job_skills' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON job_skills';
    END LOOP;

    -- Drop existing policies on job_portfolio_items if they exist
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'job_portfolio_items' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON job_portfolio_items';
    END LOOP;

    -- Drop existing policies on job_packages if they exist
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'job_packages' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON job_packages';
    END LOOP;

    -- Drop existing policies on job_applications if they exist
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'job_applications' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON job_applications';
    END LOOP;

    -- Drop existing policies on job_reviews if they exist
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'job_reviews' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON job_reviews';
    END LOOP;
END $$;

-- Create job categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS job_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  icon text,
  created_at timestamptz DEFAULT now()
);

-- Create jobs table if it doesn't exist
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  category_id uuid REFERENCES job_categories(id),
  description text NOT NULL,
  pricing_type text NOT NULL CHECK (pricing_type IN ('hourly', 'fixed', 'package')),
  base_price decimal(10,2),
  hourly_rate decimal(10,2),
  delivery_time integer DEFAULT 7,
  revisions_included integer DEFAULT 0,
  requirements text,
  terms_conditions text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
  featured boolean DEFAULT false,
  views_count integer DEFAULT 0,
  applications_count integer DEFAULT 0,
  rating decimal(3,2) DEFAULT 0,
  reviews_count integer DEFAULT 0,
  availability_hours jsonb,
  response_time text DEFAULT 'within 24 hours',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create job skills table if it doesn't exist
CREATE TABLE IF NOT EXISTS job_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  skill_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(job_id, skill_name)
);

-- Create job portfolio items table if it doesn't exist
CREATE TABLE IF NOT EXISTS job_portfolio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  image_url text,
  file_url text,
  file_type text CHECK (file_type IN ('image', 'video', 'document', 'link')),
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create job packages table if it doesn't exist
CREATE TABLE IF NOT EXISTS job_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL,
  price decimal(10,2) NOT NULL,
  delivery_time integer NOT NULL,
  revisions_included integer DEFAULT 0,
  features jsonb,
  is_popular boolean DEFAULT false,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create job applications table if it doesn't exist
CREATE TABLE IF NOT EXISTS job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  package_id uuid REFERENCES job_packages(id),
  message text NOT NULL,
  budget decimal(10,2),
  timeline text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(job_id, applicant_id)
);

-- Create job reviews table if it doesn't exist
CREATE TABLE IF NOT EXISTS job_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(application_id, reviewer_id)
);

-- Insert default job categories if they don't exist
INSERT INTO job_categories (name, description, icon) VALUES
('Web Development', 'Frontend, backend, and full-stack web development services', '💻'),
('Mobile Development', 'iOS, Android, and cross-platform mobile app development', '📱'),
('Design & Creative', 'Graphic design, UI/UX, branding, and creative services', '🎨'),
('Writing & Translation', 'Content writing, copywriting, translation, and editing', '✍️'),
('Digital Marketing', 'SEO, social media, advertising, and marketing services', '📈'),
('Video & Animation', 'Video editing, motion graphics, and animation services', '🎬'),
('Music & Audio', 'Audio editing, music production, and voice-over services', '🎵'),
('Programming & Tech', 'Software development, data science, and technical services', '⚙️'),
('Business', 'Consulting, business planning, and administrative services', '💼'),
('Lifestyle', 'Health, fitness, cooking, and personal development services', '🌟')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS on all tables
ALTER TABLE job_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_reviews ENABLE ROW LEVEL SECURITY;

-- Create new policies for job_categories
CREATE POLICY "job_categories_select_policy"
  ON job_categories FOR SELECT
  TO authenticated
  USING (true);

-- Create new policies for jobs
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

-- Create new policies for job_skills
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

-- Create new policies for job_portfolio_items
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

-- Create new policies for job_packages
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

-- Create new policies for job_applications
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

-- Create new policies for job_reviews
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
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_category_id ON jobs(category_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_rating ON jobs(rating);
CREATE INDEX IF NOT EXISTS idx_jobs_featured ON jobs(featured);

CREATE INDEX IF NOT EXISTS idx_job_skills_job_id ON job_skills(job_id);
CREATE INDEX IF NOT EXISTS idx_job_portfolio_items_job_id ON job_portfolio_items(job_id);
CREATE INDEX IF NOT EXISTS idx_job_packages_job_id ON job_packages(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_job_id ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_applicant_id ON job_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_job_reviews_job_id ON job_reviews(job_id);

-- Grant permissions
GRANT ALL ON job_categories TO authenticated;
GRANT ALL ON jobs TO authenticated;
GRANT ALL ON job_skills TO authenticated;
GRANT ALL ON job_portfolio_items TO authenticated;
GRANT ALL ON job_packages TO authenticated;
GRANT ALL ON job_applications TO authenticated;
GRANT ALL ON job_reviews TO authenticated;

-- Ensure sequences are accessible
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create or replace function to update job stats
CREATE OR REPLACE FUNCTION update_job_stats()
RETURNS trigger AS $$
BEGIN
  -- Update applications count
  IF TG_TABLE_NAME = 'job_applications' THEN
    UPDATE jobs 
    SET applications_count = (
      SELECT COUNT(*) FROM job_applications 
      WHERE job_id = COALESCE(NEW.job_id, OLD.job_id)
    )
    WHERE id = COALESCE(NEW.job_id, OLD.job_id);
  END IF;
  
  -- Update reviews count and rating
  IF TG_TABLE_NAME = 'job_reviews' THEN
    UPDATE jobs 
    SET 
      reviews_count = (
        SELECT COUNT(*) FROM job_reviews 
        WHERE job_id = COALESCE(NEW.job_id, OLD.job_id)
      ),
      rating = (
        SELECT ROUND(AVG(rating)::numeric, 2) FROM job_reviews 
        WHERE job_id = COALESCE(NEW.job_id, OLD.job_id)
      )
    WHERE id = COALESCE(NEW.job_id, OLD.job_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ language plpgsql security definer;

-- Create or replace function to update job updated_at timestamp
CREATE OR REPLACE FUNCTION update_job_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language plpgsql;

-- Drop existing triggers if they exist and recreate them
DROP TRIGGER IF EXISTS update_job_applications_count ON job_applications;
CREATE TRIGGER update_job_applications_count
  AFTER INSERT OR DELETE ON job_applications
  FOR EACH ROW EXECUTE FUNCTION update_job_stats();

DROP TRIGGER IF EXISTS update_job_reviews_stats ON job_reviews;
CREATE TRIGGER update_job_reviews_stats
  AFTER INSERT OR UPDATE OR DELETE ON job_reviews
  FOR EACH ROW EXECUTE FUNCTION update_job_stats();

DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;
CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_job_updated_at();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_job_stats TO authenticated;
GRANT EXECUTE ON FUNCTION update_job_updated_at TO authenticated;

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';