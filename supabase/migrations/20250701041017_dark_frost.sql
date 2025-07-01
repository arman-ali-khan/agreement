/*
  # Fix profile creation and RLS policies

  1. Issues Fixed
    - Profile not being created on user signup
    - Dashboard failing to load due to missing profile data
    - RLS policies preventing proper data access

  2. Changes
    - Improve the handle_new_user function with better error handling
    - Add missing RLS policies for proper data access
    - Ensure profiles are created with all required fields
*/

-- First, let's make sure the handle_new_user function works properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_role_val user_role;
BEGIN
  -- Parse the role from metadata, default to 'buyer'
  BEGIN
    user_role_val := COALESCE((new.raw_user_meta_data->>'role')::user_role, 'buyer'::user_role);
  EXCEPTION
    WHEN OTHERS THEN
      user_role_val := 'buyer'::user_role;
  END;

  -- Insert profile with proper error handling
  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    new.id, 
    COALESCE(new.email, ''), 
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    new.raw_user_meta_data->>'phone',
    user_role_val
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    updated_at = now();
  
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Failed to create profile for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$$ language plpgsql security definer;

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Add a policy to allow users to view profiles of other parties in their contracts
-- This is needed for the dashboard to show contract party information
CREATE POLICY "Users can view profiles of contract parties"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    -- Allow viewing own profile
    auth.uid() = id 
    OR 
    -- Allow viewing profiles of users in the same contracts
    id IN (
      SELECT DISTINCT 
        CASE 
          WHEN buyer_id = auth.uid() THEN seller_id
          WHEN seller_id = auth.uid() THEN buyer_id
        END
      FROM contracts 
      WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
    )
  );

-- Ensure users can insert their own profile (needed for manual profile creation fallback)
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Add policy to allow reading contracts with joined profile data
CREATE POLICY "Users can view contract details with profiles"
  ON contracts FOR SELECT
  TO authenticated
  USING (
    buyer_id = auth.uid() OR seller_id = auth.uid()
  );