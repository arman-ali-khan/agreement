/*
  # Disable email verification requirement

  1. Changes
    - Update auth settings to disable email confirmation
    - Allow users to sign in immediately after registration
    - Remove email verification checks from the application

  2. Security
    - Users can sign in immediately without email verification
    - Maintain existing RLS policies for data security
*/

-- Note: This migration handles database-level changes
-- The main email verification setting needs to be configured in Supabase dashboard
-- under Authentication > Settings > Email confirmation = disabled

-- Ensure we have a function to handle immediate profile creation
-- This ensures profiles are created even without email verification
CREATE OR REPLACE FUNCTION public.handle_new_user_no_verification()
RETURNS trigger AS $$
DECLARE
  user_role_val text;
  user_full_name text;
  user_phone text;
  user_email text;
BEGIN
  -- Log the trigger execution for debugging
  RAISE LOG 'Creating profile for user (no verification): %', new.id;
  
  -- Extract values from metadata
  user_email := COALESCE(new.email, '');
  user_full_name := COALESCE(new.raw_user_meta_data->>'full_name', 'User');
  user_phone := new.raw_user_meta_data->>'phone';
  user_role_val := COALESCE(new.raw_user_meta_data->>'role', 'buyer');

  -- Validate role
  IF user_role_val NOT IN ('buyer', 'seller', 'admin') THEN
    user_role_val := 'buyer';
  END IF;

  -- Insert the profile immediately (no email verification needed)
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
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    updated_at = now();
  
  RAISE LOG 'Successfully created profile for user (no verification): %', new.id;
  RETURN new;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error creating profile for user %: % - %', new.id, SQLSTATE, SQLERRM;
    RETURN new;
END;
$$ language plpgsql security definer;

-- Update the trigger to use the new function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_no_verification();

-- Grant execute permission on the new function
GRANT EXECUTE ON FUNCTION public.handle_new_user_no_verification TO authenticated;