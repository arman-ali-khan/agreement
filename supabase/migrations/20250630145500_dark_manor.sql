/*
  # DealVault Database Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, references auth.users)
      - `email` (text)
      - `full_name` (text)
      - `role` (enum: buyer, seller, admin)
      - `avatar_url` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `contracts`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `buyer_id` (uuid, references profiles)
      - `seller_id` (uuid, references profiles)
      - `terms` (text)
      - `status` (enum: draft, pending, active, fulfilled, completed, cancelled, disputed)
      - `deadline` (timestamp)
      - `file_url` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `contract_events`
      - `id` (uuid, primary key)
      - `contract_id` (uuid, references contracts)
      - `user_id` (uuid, references profiles)
      - `action_type` (enum: created, accepted, declined, fulfilled, completed, disputed)
      - `notes` (text)
      - `file_url` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Admin policies for contract moderation

  3. Functions
    - Trigger to update updated_at timestamps
    - Function to handle user profile creation
*/

-- Create custom types
CREATE TYPE user_role AS ENUM ('buyer', 'seller', 'admin');
CREATE TYPE contract_status AS ENUM ('draft', 'pending', 'active', 'fulfilled', 'completed', 'cancelled', 'disputed');
CREATE TYPE event_action AS ENUM ('created', 'accepted', 'declined', 'fulfilled', 'completed', 'disputed', 'uploaded_proof');

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role user_role NOT NULL DEFAULT 'buyer',
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create contracts table
CREATE TABLE IF NOT EXISTS contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  buyer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  seller_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  terms text NOT NULL,
  status contract_status DEFAULT 'draft',
  deadline timestamptz NOT NULL,
  file_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create contract_events table
CREATE TABLE IF NOT EXISTS contract_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES contracts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  action_type event_action NOT NULL,
  notes text,
  file_url text,
  created_at timestamptz DEFAULT now()
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Create function to handle new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name', 'Unknown User'));
  RETURN new;
END;
$$ language plpgsql security definer;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can view other profiles in contracts"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT buyer_id FROM contracts WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
      UNION
      SELECT seller_id FROM contracts WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
    )
  );

-- RLS Policies for contracts
CREATE POLICY "Users can view contracts they're involved in"
  ON contracts FOR SELECT
  TO authenticated
  USING (buyer_id = auth.uid() OR seller_id = auth.uid());

CREATE POLICY "Users can create contracts"
  ON contracts FOR INSERT
  TO authenticated
  WITH CHECK (buyer_id = auth.uid() OR seller_id = auth.uid());

CREATE POLICY "Users can update contracts they're involved in"
  ON contracts FOR UPDATE
  TO authenticated
  USING (buyer_id = auth.uid() OR seller_id = auth.uid());

-- RLS Policies for contract_events
CREATE POLICY "Users can view events for their contracts"
  ON contract_events FOR SELECT
  TO authenticated
  USING (
    contract_id IN (
      SELECT id FROM contracts WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
    )
  );

CREATE POLICY "Users can create events for their contracts"
  ON contract_events FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    contract_id IN (
      SELECT id FROM contracts WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
    )
  );

-- Admin policies
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can view all contracts"
  ON contracts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can view all contract events"
  ON contract_events FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );