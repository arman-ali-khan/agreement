/*
  # Fix RLS Infinite Recursion in Profiles Table

  1. Problem Fixed
    - Infinite recursion in "Users can view profiles of contract parties" policy
    - Policy was querying the same profiles table it was protecting
    - Caused circular dependency during RLS evaluation

  2. Solution
    - Replace the recursive subquery with a direct EXISTS clause
    - Check contracts table directly without referencing profiles
    - Maintain same security logic without recursion
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view profiles of contract parties" ON profiles;

-- Create a new policy that avoids recursion by using EXISTS instead of IN with subquery
CREATE POLICY "Users can view profiles of contract parties"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    -- Allow viewing profiles of users who are contract parties with the current user
    EXISTS (
      SELECT 1 
      FROM contracts 
      WHERE (
        (buyer_id = auth.uid() AND seller_id = profiles.id) OR
        (seller_id = auth.uid() AND buyer_id = profiles.id)
      )
    )
  );