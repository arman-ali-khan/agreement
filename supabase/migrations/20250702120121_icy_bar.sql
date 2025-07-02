/*
  # Fix profile RLS policies for proper joins

  1. Problem
    - RLS policies on profiles table are too restrictive
    - Prevents PostgREST from discovering foreign key relationships
    - Causes "Could not find relationship" errors for joins

  2. Solution
    - Drop existing restrictive SELECT policies on profiles
    - Create comprehensive policy allowing authenticated users to view:
      - Their own profile
      - Profiles of contract parties they're involved with
    - Remove recursive admin check to prevent infinite recursion

  3. Security
    - Maintains data privacy while enabling necessary joins
    - Users can only see profiles relevant to their contracts
    - Removes infinite recursion issue
*/

-- Drop existing SELECT policies on profiles to avoid conflicts
DROP POLICY IF EXISTS "users_can_view_own_profile_full" ON profiles;
DROP POLICY IF EXISTS "users_can_lookup_profiles_by_email" ON profiles;
DROP POLICY IF EXISTS "users_can_view_own_profile" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated users to view relevant profiles" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated users to view relevant profiles for joins" ON profiles;

-- Create a comprehensive SELECT policy for profiles
-- This policy allows authenticated users to view:
-- 1. Their own profile
-- 2. Profiles of other parties involved in their contracts
-- Note: Removed admin check to prevent infinite recursion
CREATE POLICY "Allow authenticated users to view relevant profiles for joins"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id -- User can always view their own profile
    OR
    EXISTS ( -- User can view profiles of other parties in their contracts
      SELECT 1 FROM contracts
      WHERE (contracts.buyer_id = auth.uid() AND contracts.seller_id = profiles.id)
      OR (contracts.seller_id = auth.uid() AND contracts.buyer_id = profiles.id)
    )
  );