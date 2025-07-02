/*
  # Diagnose and fix contract messages loading issue

  1. Check current state of contract_messages table
  2. Verify foreign key constraints exist
  3. Ensure RLS policies are working
  4. Fix any missing constraints or policies
*/

-- Check if contract_messages table exists and has correct structure
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contract_messages' AND table_schema = 'public') THEN
        RAISE NOTICE 'contract_messages table does not exist!';
    ELSE
        RAISE NOTICE 'contract_messages table exists';
    END IF;
END $$;

-- Check foreign key constraints on contract_messages
DO $$
DECLARE
    fk_record RECORD;
BEGIN
    RAISE NOTICE 'Checking foreign key constraints on contract_messages:';
    FOR fk_record IN 
        SELECT 
            conname as constraint_name,
            pg_get_constraintdef(c.oid) as constraint_def
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'public'
        AND t.relname = 'contract_messages'
        AND c.contype = 'f'
    LOOP
        RAISE NOTICE 'FK Constraint: % - %', fk_record.constraint_name, fk_record.constraint_def;
    END LOOP;
END $$;

-- Ensure the reply_to_id foreign key constraint exists with correct name
DO $$
BEGIN
    -- Check if the specific constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'public'
        AND t.relname = 'contract_messages'
        AND c.conname = 'contract_messages_reply_to_id_fkey'
    ) THEN
        RAISE NOTICE 'Adding missing reply_to_id foreign key constraint';
        
        -- First drop any existing constraint on reply_to_id
        DECLARE
            existing_constraint text;
        BEGIN
            SELECT conname INTO existing_constraint
            FROM pg_constraint c
            JOIN pg_class t ON c.conrelid = t.oid
            JOIN pg_namespace n ON t.relnamespace = n.oid
            WHERE n.nspname = 'public'
            AND t.relname = 'contract_messages'
            AND c.contype = 'f'
            AND c.conkey = ARRAY[(
                SELECT attnum FROM pg_attribute 
                WHERE attrelid = t.oid AND attname = 'reply_to_id'
            )];
            
            IF existing_constraint IS NOT NULL THEN
                EXECUTE format('ALTER TABLE contract_messages DROP CONSTRAINT %I', existing_constraint);
                RAISE NOTICE 'Dropped existing constraint: %', existing_constraint;
            END IF;
        END;
        
        -- Add the correctly named constraint
        ALTER TABLE contract_messages 
        ADD CONSTRAINT contract_messages_reply_to_id_fkey 
        FOREIGN KEY (reply_to_id) REFERENCES contract_messages(id);
        
        RAISE NOTICE 'Added contract_messages_reply_to_id_fkey constraint';
    ELSE
        RAISE NOTICE 'contract_messages_reply_to_id_fkey constraint already exists';
    END IF;
END $$;

-- Check RLS policies on contract_messages
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    RAISE NOTICE 'Checking RLS policies on contract_messages:';
    FOR policy_record IN 
        SELECT policyname, cmd, qual, with_check
        FROM pg_policies 
        WHERE tablename = 'contract_messages' AND schemaname = 'public'
    LOOP
        RAISE NOTICE 'Policy: % (%) - USING: % WITH CHECK: %', 
            policy_record.policyname, 
            policy_record.cmd,
            policy_record.qual,
            policy_record.with_check;
    END LOOP;
END $$;

-- Ensure RLS is enabled
ALTER TABLE contract_messages ENABLE ROW LEVEL SECURITY;

-- Verify the profiles foreign key constraint exists with correct name
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'public'
        AND t.relname = 'contract_messages'
        AND c.conname = 'contract_messages_user_id_fkey'
    ) THEN
        -- Add the user_id foreign key constraint with correct name
        ALTER TABLE contract_messages 
        ADD CONSTRAINT contract_messages_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES profiles(id);
        
        RAISE NOTICE 'Added contract_messages_user_id_fkey constraint';
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_contract_messages_reply_to_id ON contract_messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_contract_messages_user_id ON contract_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_contract_messages_contract_id ON contract_messages(contract_id);

-- Grant permissions
GRANT ALL ON contract_messages TO authenticated;

-- Enable real-time if not already enabled
DO $$
BEGIN
    -- Check if table is in realtime publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'contract_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE contract_messages;
        RAISE NOTICE 'Added contract_messages to realtime publication';
    END IF;
END $$;