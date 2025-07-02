/*
  # Add real-time chat and proof viewing features

  1. New Tables
    - `contract_messages` - Store chat messages for contracts
    - `contract_proofs` - Store proof files uploaded by parties
    
  2. Security
    - Enable RLS on all new tables
    - Add policies for admins, buyers, and sellers
    - Allow real-time subscriptions for chat
    
  3. Features
    - Real-time chat between contract parties and admin
    - Proof file management with admin oversight
    - Message history and file tracking
*/

-- Create contract_messages table for real-time chat
CREATE TABLE IF NOT EXISTS contract_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'system')),
  file_url text,
  created_at timestamptz DEFAULT now()
);

-- Create contract_proofs table for proof file management
CREATE TABLE IF NOT EXISTS contract_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  proof_type text NOT NULL CHECK (proof_type IN ('delivery', 'payment', 'completion', 'other')),
  file_url text NOT NULL,
  file_name text NOT NULL,
  description text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE contract_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_proofs ENABLE ROW LEVEL SECURITY;

-- Policies for contract_messages
-- Allow contract parties and admins to view messages
CREATE POLICY "contract_parties_and_admins_can_view_messages"
  ON contract_messages FOR SELECT
  TO authenticated
  USING (
    -- User is part of the contract
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = contract_messages.contract_id 
      AND (contracts.buyer_id = auth.uid() OR contracts.seller_id = auth.uid())
    )
    OR
    -- User is admin
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Allow contract parties and admins to send messages
CREATE POLICY "contract_parties_and_admins_can_send_messages"
  ON contract_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User is part of the contract
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = contract_messages.contract_id 
      AND (contracts.buyer_id = auth.uid() OR contracts.seller_id = auth.uid())
    )
    OR
    -- User is admin
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Policies for contract_proofs
-- Allow contract parties and admins to view proofs
CREATE POLICY "contract_parties_and_admins_can_view_proofs"
  ON contract_proofs FOR SELECT
  TO authenticated
  USING (
    -- User is part of the contract
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = contract_proofs.contract_id 
      AND (contracts.buyer_id = auth.uid() OR contracts.seller_id = auth.uid())
    )
    OR
    -- User is admin
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Allow contract parties to upload proofs
CREATE POLICY "contract_parties_can_upload_proofs"
  ON contract_proofs FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = contract_proofs.contract_id 
      AND (contracts.buyer_id = auth.uid() OR contracts.seller_id = auth.uid())
    )
  );

-- Allow admins to update proof status (approve/reject)
CREATE POLICY "admins_can_update_proof_status"
  ON contract_proofs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contract_messages_contract_id ON contract_messages(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_messages_created_at ON contract_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_contract_proofs_contract_id ON contract_proofs(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_proofs_status ON contract_proofs(status);

-- Grant permissions
GRANT ALL ON contract_messages TO authenticated;
GRANT ALL ON contract_proofs TO authenticated;

-- Enable real-time for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE contract_messages;