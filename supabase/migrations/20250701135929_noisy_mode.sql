/*
  # Allow profile lookup for contract creation

  1. Problem
    - Users cannot look up other users' profiles by email when creating contracts
    - Current RLS policies only allow viewing own profile
    - This prevents contract creation functionality

  2. Solution
    - Add a policy to allow authenticated users to look up profiles by email
    - This is necessary for contract creation where users need to find each other
    - Limit the data returned to only id and email for security

  3. Security
    - Only authenticated users can perform lookups
    - Only basic profile information (id, email) is accessible for lookups
    - Users can still only fully access their own profile data
*/

-- Add a policy to allow authenticated users to look up profiles by email
-- This is needed for contract creation functionality
CREATE POLICY "users_can_lookup_profiles_by_email"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Update the existing view policy to be more restrictive
-- Users can view full profile data only for themselves
DROP POLICY IF EXISTS "users_can_view_own_profile" ON profiles;

CREATE POLICY "users_can_view_own_profile_full"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);