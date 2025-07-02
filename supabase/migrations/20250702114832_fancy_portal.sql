/*
  # Fix missing contract_messages and contract_proofs tables

  1. Issues Fixed
    - contract_messages table does not exist
    - contract_proofs table may not exist
    - Missing foreign key relationships
    - Missing RLS policies

  2. Changes
    - Create contract_messages table if it doesn't exist
    - Create contract_proofs table if it doesn't exist
    - Add proper foreign key constraints
    - Set up RLS policies
    - Enable real-time subscriptions

  3. Security
    - Enable RLS on all tables
    - Add policies for contract parties and admins
    - Ensure proper access control
*/

-- Create contract_messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS contract_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'system')),
  file_url text,
  message_status text DEFAULT 'sent' CHECK (message_status IN ('sent', 'delivered', 'read')),
  reply_to_id uuid REFERENCES contract_messages(id),
  edited_at timestamptz,
  file_type text CHECK (file_type IN ('image', 'document', 'video', 'audio')),
  file_size bigint,
  thumbnail_url text,
  created_at timestamptz DEFAULT now()
);

-- Create contract_proofs table if it doesn't exist
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

-- Create contract_message_reactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS contract_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES contract_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction text NOT NULL CHECK (reaction IN ('👍', '👎', '❤️', '😊', '😢', '😮', '😡')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, reaction)
);

-- Create admin_chat_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  left_at timestamptz,
  is_active boolean DEFAULT true,
  UNIQUE(contract_id, admin_id)
);

-- Enable RLS on all tables
ALTER TABLE contract_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_chat_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "contract_parties_and_admins_can_view_messages" ON contract_messages;
DROP POLICY IF EXISTS "contract_parties_and_admins_can_send_messages" ON contract_messages;
DROP POLICY IF EXISTS "enhanced_contract_chat_view_access" ON contract_messages;
DROP POLICY IF EXISTS "enhanced_contract_chat_send_access" ON contract_messages;
DROP POLICY IF EXISTS "users_can_edit_own_messages" ON contract_messages;

-- Policies for contract_messages
CREATE POLICY "contract_parties_and_admins_can_view_messages"
  ON contract_messages FOR SELECT
  TO authenticated
  USING (
    -- Contract parties can view messages
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = contract_messages.contract_id 
      AND (contracts.buyer_id = auth.uid() OR contracts.seller_id = auth.uid())
    )
    OR
    -- All admins can view all contract messages
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "contract_parties_and_admins_can_send_messages"
  ON contract_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND
    (
      -- Contract parties can send messages to their contracts
      EXISTS (
        SELECT 1 FROM contracts 
        WHERE contracts.id = contract_messages.contract_id 
        AND (contracts.buyer_id = auth.uid() OR contracts.seller_id = auth.uid())
      )
      OR
      -- Admins can send messages to any contract
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
      )
    )
  );

CREATE POLICY "users_can_edit_own_messages"
  ON contract_messages FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Drop existing policies for contract_proofs if they exist
DROP POLICY IF EXISTS "contract_parties_and_admins_can_view_proofs" ON contract_proofs;
DROP POLICY IF EXISTS "contract_parties_can_upload_proofs" ON contract_proofs;
DROP POLICY IF EXISTS "admins_can_update_proof_status" ON contract_proofs;

-- Policies for contract_proofs
CREATE POLICY "contract_parties_and_admins_can_view_proofs"
  ON contract_proofs FOR SELECT
  TO authenticated
  USING (
    -- Contract parties can view proofs
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = contract_proofs.contract_id 
      AND (contracts.buyer_id = auth.uid() OR contracts.seller_id = auth.uid())
    )
    OR
    -- All admins can view all proofs
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "contract_parties_can_upload_proofs"
  ON contract_proofs FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND
    (
      EXISTS (
        SELECT 1 FROM contracts 
        WHERE contracts.id = contract_proofs.contract_id 
        AND (contracts.buyer_id = auth.uid() OR contracts.seller_id = auth.uid())
      )
      OR
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
      )
    )
  );

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

-- Policies for message reactions
CREATE POLICY "contract_parties_and_admins_can_view_reactions"
  ON contract_message_reactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contract_messages cm
      JOIN contracts c ON c.id = cm.contract_id
      WHERE cm.id = contract_message_reactions.message_id
      AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "contract_parties_and_admins_can_add_reactions"
  ON contract_message_reactions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND
    (
      EXISTS (
        SELECT 1 FROM contract_messages cm
        JOIN contracts c ON c.id = cm.contract_id
        WHERE cm.id = contract_message_reactions.message_id
        AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
      )
      OR
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
      )
    )
  );

CREATE POLICY "users_can_remove_own_reactions"
  ON contract_message_reactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Policies for admin chat sessions
CREATE POLICY "admins_can_manage_chat_sessions"
  ON admin_chat_sessions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    admin_id = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "contract_parties_can_view_admin_sessions"
  ON admin_chat_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = admin_chat_sessions.contract_id 
      AND (contracts.buyer_id = auth.uid() OR contracts.seller_id = auth.uid())
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contract_messages_contract_id ON contract_messages(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_messages_created_at ON contract_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_contract_messages_contract_user ON contract_messages(contract_id, user_id);
CREATE INDEX IF NOT EXISTS idx_contract_messages_status ON contract_messages(message_status);
CREATE INDEX IF NOT EXISTS idx_contract_messages_reply_to ON contract_messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_contract_messages_file_type ON contract_messages(file_type);

CREATE INDEX IF NOT EXISTS idx_contract_proofs_contract_id ON contract_proofs(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_proofs_status ON contract_proofs(status);
CREATE INDEX IF NOT EXISTS idx_contract_proofs_uploaded_by ON contract_proofs(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON contract_message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user ON contract_message_reactions(user_id);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_contract ON admin_chat_sessions(contract_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_active ON admin_chat_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin ON admin_chat_sessions(admin_id);

-- Grant permissions to authenticated users
GRANT ALL ON contract_messages TO authenticated;
GRANT ALL ON contract_proofs TO authenticated;
GRANT ALL ON contract_message_reactions TO authenticated;
GRANT ALL ON admin_chat_sessions TO authenticated;

-- Enable real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE contract_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE contract_message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE admin_chat_sessions;

-- Create function to automatically join admin to chat when they send first message
CREATE OR REPLACE FUNCTION handle_admin_chat_join()
RETURNS trigger AS $$
BEGIN
  -- If the user is an admin and this is their first message in this contract
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = NEW.user_id 
    AND profiles.role = 'admin'
  ) THEN
    -- Insert or update admin chat session
    INSERT INTO admin_chat_sessions (contract_id, admin_id, joined_at, is_active)
    VALUES (NEW.contract_id, NEW.user_id, now(), true)
    ON CONFLICT (contract_id, admin_id) 
    DO UPDATE SET 
      joined_at = now(),
      is_active = true,
      left_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ language plpgsql security definer;

-- Create trigger for admin chat join
DROP TRIGGER IF EXISTS on_admin_message_sent ON contract_messages;
CREATE TRIGGER on_admin_message_sent
  AFTER INSERT ON contract_messages
  FOR EACH ROW EXECUTE FUNCTION handle_admin_chat_join();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION handle_admin_chat_join TO authenticated;