/*
  # Fix infinite recursion in profiles RLS policy - Final Solution

  1. Problem
    - The profiles RLS policy is causing infinite recursion
    - Even checking profiles.id within the policy creates circular dependency
    - PostgreSQL cannot resolve the policy when it references the same table

  2. Solution
    - Drop ALL SELECT policies on profiles table
    - Create a simple policy that only allows users to view their own profile
    - Remove contract party profile viewing from RLS level
    - Handle contract party data access at application level instead

  3. Security
    - Users can only view their own profile via RLS
    - Application will handle contract party data through other means
    - Maintains security while eliminating recursion
*/

-- Drop ALL existing SELECT policies on profiles to eliminate recursion
DROP POLICY IF EXISTS "users_can_view_own_profile_full" ON profiles;
DROP POLICY IF EXISTS "users_can_lookup_profiles_by_email" ON profiles;
DROP POLICY IF EXISTS "users_can_view_own_profile" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated users to view relevant profiles" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated users to view relevant profiles for joins" ON profiles;

-- Create a simple, non-recursive policy that only allows viewing own profile
CREATE POLICY "users_can_view_own_profile_only"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Note: We're intentionally NOT allowing cross-profile viewing at the RLS level
-- to prevent any possibility of recursion. The application will need to handle
-- contract party information through other means, such as:
-- 1. Storing party names directly in contracts table
-- 2. Using server-side functions that bypass RLS
-- 3. Using service role for specific queries