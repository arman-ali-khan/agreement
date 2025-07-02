/*
  # Enhanced Admin Real-time Chat Schema

  1. New Features
    - Enhanced contract_messages table for better admin chat support
    - Image/file sharing capabilities
    - Admin-specific message types
    - Better real-time subscriptions
    - Message reactions and status tracking

  2. Tables Enhanced
    - contract_messages: Enhanced with admin features, image support, message status
    - New indexes for better performance
    - Enhanced RLS policies for admin access

  3. Security
    - Admin can participate in all contract chats
    - Buyers and sellers can only access their contract chats
    - Enhanced file sharing permissions
    - Real-time subscription controls
*/

-- Add new columns to contract_messages for enhanced admin chat
ALTER TABLE contract_messages 
ADD COLUMN IF NOT EXISTS message_status text DEFAULT 'sent' CHECK (message_status IN ('sent', 'delivered', 'read')),
ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES contract_messages(id),
ADD COLUMN IF NOT EXISTS edited_at timestamptz,
ADD COLUMN IF NOT EXISTS file_type text CHECK (file_type IN ('image', 'document', 'video', 'audio')),
ADD COLUMN IF NOT EXISTS file_size bigint,
ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Create message reactions table for enhanced interaction
CREATE TABLE IF NOT EXISTS contract_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES contract_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction text NOT NULL CHECK (reaction IN ('👍', '👎', '❤️', '😊', '😢', '😮', '😡')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, reaction)
);

-- Create admin chat sessions table to track admin participation
CREATE TABLE IF NOT EXISTS admin_chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  left_at timestamptz,
  is_active boolean DEFAULT true,
  UNIQUE(contract_id, admin_id)
);

-- Enable RLS on new tables
ALTER TABLE contract_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_chat_sessions ENABLE ROW LEVEL SECURITY;

-- Enhanced policies for contract_messages to support admin participation
DROP POLICY IF EXISTS "contract_parties_and_admins_can_view_messages" ON contract_messages;
DROP POLICY IF EXISTS "contract_parties_and_admins_can_send_messages" ON contract_messages;

-- Allow viewing messages for contract parties and all admins
CREATE POLICY "enhanced_contract_chat_view_access"
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

-- Allow sending messages for contract parties and admins
CREATE POLICY "enhanced_contract_chat_send_access"
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

-- Allow updating own messages (for editing)
CREATE POLICY "users_can_edit_own_messages"
  ON contract_messages FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

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
CREATE INDEX IF NOT EXISTS idx_contract_messages_contract_user ON contract_messages(contract_id, user_id);
CREATE INDEX IF NOT EXISTS idx_contract_messages_status ON contract_messages(message_status);
CREATE INDEX IF NOT EXISTS idx_contract_messages_reply_to ON contract_messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_contract_messages_file_type ON contract_messages(file_type);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON contract_message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_contract ON admin_chat_sessions(contract_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_active ON admin_chat_sessions(is_active);

-- Grant permissions
GRANT ALL ON contract_message_reactions TO authenticated;
GRANT ALL ON admin_chat_sessions TO authenticated;

-- Enable real-time for new tables
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

-- Create function to mark admin as left when they haven't been active
CREATE OR REPLACE FUNCTION mark_inactive_admin_sessions()
RETURNS void AS $$
BEGIN
  UPDATE admin_chat_sessions 
  SET is_active = false, left_at = now()
  WHERE is_active = true 
  AND joined_at < now() - interval '1 hour'
  AND NOT EXISTS (
    SELECT 1 FROM contract_messages 
    WHERE contract_messages.contract_id = admin_chat_sessions.contract_id
    AND contract_messages.user_id = admin_chat_sessions.admin_id
    AND contract_messages.created_at > now() - interval '30 minutes'
  );
END;
$$ language plpgsql security definer;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION handle_admin_chat_join TO authenticated;
GRANT EXECUTE ON FUNCTION mark_inactive_admin_sessions TO authenticated;