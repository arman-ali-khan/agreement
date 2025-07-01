/*
  # Add phone number field to profiles table

  1. Changes
    - Add `phone` column to `profiles` table
    - Update the handle_new_user function to include phone number

  2. Security
    - No changes to RLS policies needed
*/

-- Add phone column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone text;
  END IF;
END $$;

-- Update the handle_new_user function to include phone
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Unknown User'),
    new.raw_user_meta_data->>'phone',
    COALESCE(new.raw_user_meta_data->>'role', 'buyer')::user_role
  );
  RETURN new;
END;
$$ language plpgsql security definer;