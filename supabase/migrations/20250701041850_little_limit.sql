/*
  # Fix Profile Creation Issues

  1. Issues Fixed
    - Profile not being created during user signup
    - Trigger function not working properly
    - RLS policies blocking profile creation
    - Manual fallback profile creation failing

  2. Changes
    - Create a more robust trigger function
    - Add better error handling and logging
    - Ensure RLS policies allow profile creation
    - Add a function to manually create profiles if needed

  3. Security
    - Maintain proper RLS policies
    - Allow users to create and update their own profiles
    - Allow viewing profiles of contract parties
*/

-- Drop existing trigger and function to recreate them
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create an improved function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_role_val text;
  user_full_name text;
  user_phone text;
  user_email text;
BEGIN
  -- Log the trigger execution for debugging
  RAISE LOG 'Creating profile for user: %', new.id;
  
  -- Safely extract values from metadata with better defaults
  user_email := COALESCE(new.email, '');
  user_full_name := COALESCE(new.raw_user_meta_data->>'full_name', 'User');
  user_phone := new.raw_user_meta_data->>'phone';
  user_role_val := COALESCE(new.raw_user_meta_data->>'role', 'buyer');

  -- Validate and sanitize role
  IF user_role_val NOT IN ('buyer', 'seller', 'admin') THEN
    user_role_val := 'buyer';
  END IF;

  -- Log the values we're about to insert
  RAISE LOG 'Inserting profile - Email: %, Name: %, Role: %', user_email, user_full_name, user_role_val;

  -- Insert the profile with explicit column casting
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    phone, 
    role,
    created_at,
    updated_at
  )
  VALUES (
    new.id, 
    user_email,
    user_full_name,
    user_phone,
    user_role_val::user_role,
    now(),
    now()
  );
  
  RAISE LOG 'Successfully created profile for user: %', new.id;
  RETURN new;
  
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, update it instead
    RAISE LOG 'Profile exists, updating for user: %', new.id;
    UPDATE public.profiles 
    SET 
      email = user_email,
      full_name = user_full_name,
      phone = user_phone,
      role = user_role_val::user_role,
      updated_at = now()
    WHERE id = new.id;
    RETURN new;
    
  WHEN OTHERS THEN
    -- Log the specific error for debugging
    RAISE LOG 'Error creating profile for user %: % - %', new.id, SQLSTATE, SQLERRM;
    -- Don't fail the user creation, just log the error
    RETURN new;
END;
$$ language plpgsql security definer;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create a function that can be called manually to create profiles
CREATE OR REPLACE FUNCTION public.create_profile_if_missing(
  user_id uuid,
  user_email text,
  user_full_name text DEFAULT 'User',
  user_phone text DEFAULT NULL,
  user_role text DEFAULT 'buyer'
)
RETURNS boolean AS $$
DECLARE
  profile_exists boolean;
  clean_role text;
BEGIN
  -- Check if profile already exists
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = user_id) INTO profile_exists;
  
  IF profile_exists THEN
    RAISE LOG 'Profile already exists for user: %', user_id;
    RETURN true;
  END IF;
  
  -- Validate role
  clean_role := COALESCE(user_role, 'buyer');
  IF clean_role NOT IN ('buyer', 'seller', 'admin') THEN
    clean_role := 'buyer';
  END IF;
  
  -- Create the profile
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    phone, 
    role,
    created_at,
    updated_at
  )
  VALUES (
    user_id,
    COALESCE(user_email, ''),
    COALESCE(user_full_name, 'User'),
    user_phone,
    clean_role::user_role,
    now(),
    now()
  );
  
  RAISE LOG 'Manually created profile for user: %', user_id;
  RETURN true;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error manually creating profile for user %: % - %', user_id, SQLSTATE, SQLERRM;
    RETURN false;
END;
$$ language plpgsql security definer;

-- Ensure proper RLS policies exist
-- Drop existing policies to recreate them cleanly
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles of contract parties" ON profiles;

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow users to insert their own profile (needed for manual creation)
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow users to view profiles of other parties in their contracts
CREATE POLICY "Users can view profiles of contract parties"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    -- Allow viewing profiles of users in the same contracts
    id IN (
      SELECT DISTINCT 
        CASE 
          WHEN buyer_id = auth.uid() THEN seller_id
          WHEN seller_id = auth.uid() THEN buyer_id
        END
      FROM contracts 
      WHERE (buyer_id = auth.uid() OR seller_id = auth.uid())
      AND (buyer_id IS NOT NULL AND seller_id IS NOT NULL)
    )
  );

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.contracts TO authenticated;
GRANT ALL ON public.contract_events TO authenticated;

-- Grant permission to execute the manual profile creation function
GRANT EXECUTE ON FUNCTION public.create_profile_if_missing TO authenticated;

-- Ensure the profiles table has proper defaults
ALTER TABLE profiles ALTER COLUMN email SET DEFAULT '';
ALTER TABLE profiles ALTER COLUMN full_name SET DEFAULT 'User';
ALTER TABLE profiles ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE profiles ALTER COLUMN updated_at SET DEFAULT now();

-- Add an index on the profiles table for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);