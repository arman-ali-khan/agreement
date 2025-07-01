/*
  # Fix RLS infinite recursion in profiles table

  1. Problem
    - The policy "Users can view profiles of contract parties" creates infinite recursion
    - This happens because the policy references the same table it's protecting
    - Even with EXISTS, referencing profiles.id in the policy causes recursion

  2. Solution
    - Remove the problematic policy entirely
    - Keep only the basic policies that don't cause recursion
    - Users can view their own profile and insert/update their own profile
    - Contract party information will be handled differently in the application layer

  3. Security
    - Users can only view their own profile
    - Users can create and update their own profile
    - Application will handle contract party data access through other means
*/

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can view profiles of contract parties" ON profiles;

-- Ensure we only have the basic, non-recursive policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Recreate only the safe, non-recursive policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Note: We're removing the contract parties policy to prevent recursion
-- The application will need to handle contract party information differently
-- For example, by storing party names directly in the contracts table
-- or by using a different approach that doesn't require cross-referencing profiles