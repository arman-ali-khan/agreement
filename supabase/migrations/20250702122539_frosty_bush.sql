/*
  # Fix contract messages loading issues

  1. Issues Fixed
    - Missing or incorrectly named foreign key constraints
    - Self-referencing foreign key for reply_to_id not properly configured
    - PostgREST cannot find relationships for nested queries

  2. Changes
    - Ensure all foreign key constraints have correct names
    - Fix self-referencing foreign key for reply_to_id
    - Add proper indexes for performance
    - Verify RLS policies are working

  3. Security
    - Maintain existing RLS policies
    - Ensure proper access control
*/

-- First, let's check and fix the contract_messages table structure
DO $$
BEGIN
    -- Ensure the table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contract_messages' AND table_schema = 'public') THEN
        RAISE EXCEPTION 'contract_messages table does not exist!';
    END IF;
    
    RAISE NOTICE 'contract_messages table exists, checking constraints...';
END $$;

-- Drop and recreate all foreign key constraints with correct names
-- This ensures PostgREST can find the relationships

-- Drop existing foreign key constraints if they exist
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN 
        SELECT conname
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'public'
        AND t.relname = 'contract_messages'
        AND c.contype = 'f'
    LOOP
        EXECUTE format('ALTER TABLE contract_messages DROP CONSTRAINT %I', constraint_record.conname);
        RAISE NOTICE 'Dropped constraint: %', constraint_record.conname;
    END LOOP;
END $$;

-- Add foreign key constraints with exact names PostgREST expects
ALTER TABLE contract_messages 
ADD CONSTRAINT contract_messages_contract_id_fkey 
FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;

ALTER TABLE contract_messages 
ADD CONSTRAINT contract_messages_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Add self-referencing foreign key for reply_to_id
ALTER TABLE contract_messages 
ADD CONSTRAINT contract_messages_reply_to_id_fkey 
FOREIGN KEY (reply_to_id) REFERENCES contract_messages(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contract_messages_contract_id ON contract_messages(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_messages_user_id ON contract_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_contract_messages_reply_to_id ON contract_messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_contract_messages_created_at ON contract_messages(created_at);

-- Ensure RLS is enabled
ALTER TABLE contract_messages ENABLE ROW LEVEL SECURITY;

-- Verify and recreate RLS policies if needed
DROP POLICY IF EXISTS "contract_parties_and_admins_can_view_messages" ON contract_messages;
DROP POLICY IF EXISTS "contract_parties_and_admins_can_send_messages" ON contract_messages;
DROP POLICY IF EXISTS "users_can_edit_own_messages" ON contract_messages;

-- Policy to allow viewing messages
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
    -- Admins can view all messages
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Policy to allow sending messages
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

-- Policy to allow editing own messages
CREATE POLICY "users_can_edit_own_messages"
  ON contract_messages FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Grant permissions
GRANT ALL ON contract_messages TO authenticated;

-- Ensure real-time is enabled
DO $$
BEGIN
    -- Add to realtime publication if not already there
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'contract_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE contract_messages;
        RAISE NOTICE 'Added contract_messages to realtime publication';
    ELSE
        RAISE NOTICE 'contract_messages already in realtime publication';
    END IF;
END $$;

-- Log final state
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    RAISE NOTICE 'Final foreign key constraints on contract_messages:';
    FOR constraint_record IN 
        SELECT 
            conname as constraint_name,
            pg_get_constraintdef(c.oid) as constraint_def
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'public'
        AND t.relname = 'contract_messages'
        AND c.contype = 'f'
        ORDER BY conname
    LOOP
        RAISE NOTICE 'FK: % - %', constraint_record.constraint_name, constraint_record.constraint_def;
    END LOOP;
END $$;