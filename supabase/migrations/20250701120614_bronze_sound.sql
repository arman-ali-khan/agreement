/*
  # Reset all profiles policies to fix infinite recursion

  1. Issues Fixed
    - Infinite recursion in profiles table policies
    - RLS policies preventing basic profile access
    - Complex policy logic causing database errors

  2. Changes
    - Drop ALL existing policies on profiles table
    - Recreate only the most basic, safe policies
    - Ensure no self-referencing or recursive logic
    - Allow basic CRUD operations for users on their own profiles

  3. Security
    - Users can only access their own profile data
    - No cross-referencing between profiles and contracts in policies
    - Simple, non-recursive policy logic
*/

-- First, disable RLS temporarily to ensure we can make changes
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on the profiles table to start fresh
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON profiles';
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create only the most basic, safe policies without any recursion risk

-- Allow users to view their own profile only
CREATE POLICY "users_can_view_own_profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow users to insert their own profile only
CREATE POLICY "users_can_insert_own_profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile only
CREATE POLICY "users_can_update_own_profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow users to delete their own profile only
CREATE POLICY "users_can_delete_own_profile"
  ON profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;

-- Ensure the table has proper defaults
ALTER TABLE profiles ALTER COLUMN email SET DEFAULT '';
ALTER TABLE profiles ALTER COLUMN full_name SET DEFAULT 'User';
ALTER TABLE profiles ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE profiles ALTER COLUMN updated_at SET DEFAULT now();