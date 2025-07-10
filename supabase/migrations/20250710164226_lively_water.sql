/*
  # Fix missing update_job_stats function

  1. Problem Fixed
    - The update_job_stats() function is missing but triggers are trying to use it
    - This causes errors when inserting/updating job-related data

  2. Changes
    - Create the missing update_job_stats() function
    - Create the missing update_job_updated_at() function
    - Ensure triggers are properly set up
    - Grant necessary permissions

  3. Security
    - Functions are security definer to ensure proper access
    - Maintain existing RLS policies
*/

-- Create the update_job_stats function
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

-- Create the update_job_updated_at function
CREATE OR REPLACE FUNCTION update_job_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language plpgsql;

-- Drop existing triggers if they exist and recreate them
DROP TRIGGER IF EXISTS update_job_applications_count ON job_applications;
DROP TRIGGER IF EXISTS update_job_reviews_stats ON job_reviews;
DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;

-- Create triggers to update job stats
CREATE TRIGGER update_job_applications_count
  AFTER INSERT OR DELETE ON job_applications
  FOR EACH ROW EXECUTE FUNCTION update_job_stats();

CREATE TRIGGER update_job_reviews_stats
  AFTER INSERT OR UPDATE OR DELETE ON job_reviews
  FOR EACH ROW EXECUTE FUNCTION update_job_stats();

-- Create trigger to update job updated_at
CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_job_updated_at();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_job_stats TO authenticated;
GRANT EXECUTE ON FUNCTION update_job_updated_at TO authenticated;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Job stats functions and triggers created successfully';
END $$;