/*
  # Job Listing Platform Schema

  1. New Tables
    - `job_categories` - Predefined service categories
    - `jobs` - Job/gig listings created by users
    - `job_skills` - Skills associated with jobs
    - `job_portfolio_items` - Portfolio items for jobs
    - `job_packages` - Service packages for jobs
    - `job_applications` - Applications from clients
    - `job_reviews` - Reviews and ratings

  2. Security
    - Enable RLS on all new tables
    - Add policies for job creators and applicants
    - Ensure proper access control

  3. Features
    - Job creation and management
    - Portfolio and skills tracking
    - Package-based pricing
    - Application system
    - Review and rating system
*/

-- Create job categories table
CREATE TABLE IF NOT EXISTS job_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  icon text,
  created_at timestamptz DEFAULT now()
);

-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  category_id uuid REFERENCES job_categories(id),
  description text NOT NULL,
  pricing_type text NOT NULL CHECK (pricing_type IN ('hourly', 'fixed', 'package')),
  base_price decimal(10,2),
  hourly_rate decimal(10,2),
  delivery_time integer, -- in days
  revisions_included integer DEFAULT 0,
  requirements text,
  terms_conditions text,
  status text DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
  featured boolean DEFAULT false,
  views_count integer DEFAULT 0,
  applications_count integer DEFAULT 0,
  rating decimal(3,2) DEFAULT 0,
  reviews_count integer DEFAULT 0,
  availability_hours jsonb, -- store working hours
  response_time text, -- e.g., "within 1 hour", "within 24 hours"
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create job skills table
CREATE TABLE IF NOT EXISTS job_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  skill_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(job_id, skill_name)
);

-- Create job portfolio items table
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

-- Create job packages table
CREATE TABLE IF NOT EXISTS job_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  name text NOT NULL, -- e.g., "Basic", "Standard", "Premium"
  description text NOT NULL,
  price decimal(10,2) NOT NULL,
  delivery_time integer NOT NULL, -- in days
  revisions_included integer DEFAULT 0,
  features jsonb, -- array of features included
  is_popular boolean DEFAULT false,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create job applications table
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

-- Create job reviews table
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

-- Insert default job categories
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

-- Enable RLS on all new tables
ALTER TABLE job_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_reviews ENABLE ROW LEVEL SECURITY;

-- Policies for job_categories (public read)
CREATE POLICY "Anyone can view job categories"
  ON job_categories FOR SELECT
  TO authenticated
  USING (true);

-- Policies for jobs
CREATE POLICY "Anyone can view active jobs"
  ON jobs FOR SELECT
  TO authenticated
  USING (status = 'active' OR user_id = auth.uid());

CREATE POLICY "Users can create their own jobs"
  ON jobs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own jobs"
  ON jobs FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own jobs"
  ON jobs FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Policies for job_skills
CREATE POLICY "Anyone can view job skills"
  ON job_skills FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = job_skills.job_id 
      AND (jobs.status = 'active' OR jobs.user_id = auth.uid())
    )
  );

CREATE POLICY "Job owners can manage job skills"
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

-- Policies for job_portfolio_items
CREATE POLICY "Anyone can view job portfolio items"
  ON job_portfolio_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = job_portfolio_items.job_id 
      AND (jobs.status = 'active' OR jobs.user_id = auth.uid())
    )
  );

CREATE POLICY "Job owners can manage portfolio items"
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

-- Policies for job_packages
CREATE POLICY "Anyone can view job packages"
  ON job_packages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = job_packages.job_id 
      AND (jobs.status = 'active' OR jobs.user_id = auth.uid())
    )
  );

CREATE POLICY "Job owners can manage packages"
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

-- Policies for job_applications
CREATE POLICY "Job owners and applicants can view applications"
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

CREATE POLICY "Users can create applications"
  ON job_applications FOR INSERT
  TO authenticated
  WITH CHECK (applicant_id = auth.uid());

CREATE POLICY "Applicants can update their applications"
  ON job_applications FOR UPDATE
  TO authenticated
  USING (applicant_id = auth.uid())
  WITH CHECK (applicant_id = auth.uid());

-- Policies for job_reviews
CREATE POLICY "Anyone can view job reviews"
  ON job_reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create reviews for completed applications"
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

-- Create function to update job stats
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

-- Create triggers to update job stats
DROP TRIGGER IF EXISTS update_job_applications_count ON job_applications;
CREATE TRIGGER update_job_applications_count
  AFTER INSERT OR DELETE ON job_applications
  FOR EACH ROW EXECUTE FUNCTION update_job_stats();

DROP TRIGGER IF EXISTS update_job_reviews_stats ON job_reviews;
CREATE TRIGGER update_job_reviews_stats
  AFTER INSERT OR UPDATE OR DELETE ON job_reviews
  FOR EACH ROW EXECUTE FUNCTION update_job_stats();

-- Create function to update job updated_at timestamp
CREATE OR REPLACE FUNCTION update_job_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language plpgsql;

-- Create trigger to update job updated_at
DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;
CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_job_updated_at();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_job_stats TO authenticated;
GRANT EXECUTE ON FUNCTION update_job_updated_at TO authenticated;