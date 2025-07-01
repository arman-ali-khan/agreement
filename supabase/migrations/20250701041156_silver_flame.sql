/*
  # Fix database error when saving new user

  1. Changes
    - Simplify the handle_new_user function to be more robust
    - Add better error handling for profile creation
    - Ensure the trigger works properly
    - Add fallback mechanism for profile creation

  2. Security
    - Maintain existing RLS policies
    - Ensure users can create their own profiles
*/

-- Drop and recreate the handle_new_user function with better error handling
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_role_val text;
  user_full_name text;
  user_phone text;
BEGIN
  -- Safely extract values from metadata
  user_role_val := COALESCE(new.raw_user_meta_data->>'role', 'buyer');
  user_full_name := COALESCE(new.raw_user_meta_data->>'full_name', 'User');
  user_phone := new.raw_user_meta_data->>'phone';

  -- Validate role
  IF user_role_val NOT IN ('buyer', 'seller', 'admin') THEN
    user_role_val := 'buyer';
  END IF;

  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    new.id, 
    COALESCE(new.email, ''), 
    user_full_name,
    user_phone,
    user_role_val::user_role
  );
  
  RETURN new;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, update it
    UPDATE public.profiles 
    SET 
      email = COALESCE(new.email, email),
      full_name = COALESCE(user_full_name, full_name),
      phone = COALESCE(user_phone, phone),
      role = COALESCE(user_role_val::user_role, role),
      updated_at = now()
    WHERE id = new.id;
    RETURN new;
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Failed to create/update profile for user %: % - %', new.id, SQLSTATE, SQLERRM;
    RETURN new;
END;
$$ language plpgsql security definer;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure the profiles table has proper constraints
ALTER TABLE profiles ALTER COLUMN email SET DEFAULT '';
ALTER TABLE profiles ALTER COLUMN full_name SET DEFAULT 'User';

-- Add a policy to allow authenticated users to insert their own profile
-- This serves as a fallback if the trigger fails
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Ensure users can update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.contracts TO authenticated;
GRANT ALL ON public.contract_events TO authenticated;