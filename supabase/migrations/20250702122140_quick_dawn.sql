/*
  # Fix foreign key constraint naming for contract_messages

  1. Problem
    - PostgREST cannot find relationship 'contract_messages_reply_to_id_fkey'
    - The foreign key constraint was not explicitly named
    - Frontend query expects specific constraint name

  2. Solution
    - Drop existing unnamed foreign key constraint on reply_to_id
    - Add new foreign key constraint with explicit name
    - Ensure constraint name matches frontend expectation

  3. Security
    - Maintains existing RLS policies
    - No changes to permissions or access control
*/

-- First, find and drop any existing foreign key constraint on reply_to_id column
DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Find the existing foreign key constraint name
    SELECT conname INTO constraint_name
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
    
    -- Drop the constraint if it exists
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE contract_messages DROP CONSTRAINT %I', constraint_name);
    END IF;
END $$;

-- Add the foreign key constraint with the explicit name expected by PostgREST
ALTER TABLE contract_messages 
ADD CONSTRAINT contract_messages_reply_to_id_fkey 
FOREIGN KEY (reply_to_id) REFERENCES contract_messages(id);

-- Create index for better performance on the foreign key
CREATE INDEX IF NOT EXISTS idx_contract_messages_reply_to_id ON contract_messages(reply_to_id);