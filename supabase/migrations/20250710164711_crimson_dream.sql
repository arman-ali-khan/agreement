/*
  # Notification and Messaging System

  1. New Tables
    - `notifications` - Store all types of notifications
    - `user_messages` - Store direct messages between users
    - `notification_preferences` - User notification settings

  2. Security
    - Enable RLS on all new tables
    - Add policies for users to access their own notifications and messages
    - Real-time subscriptions for instant updates

  3. Features
    - Gig application notifications
    - Message notifications (normal, gig-related, proof messages)
    - Read/unread status tracking
    - Real-time updates
*/

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('gig_application', 'message', 'contract_update', 'proof_uploaded', 'review_received', 'system')),
  title text NOT NULL,
  message text NOT NULL,
  data jsonb, -- Store additional data like IDs, links, etc.
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz -- Optional expiration for notifications
);

-- Create user messages table for direct messaging
CREATE TABLE IF NOT EXISTS user_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject text,
  message text NOT NULL,
  message_type text DEFAULT 'normal' CHECK (message_type IN ('normal', 'gig_related', 'proof_message')),
  related_job_id uuid REFERENCES jobs(id) ON DELETE SET NULL,
  related_contract_id uuid REFERENCES contracts(id) ON DELETE SET NULL,
  attachment_url text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  gig_applications boolean DEFAULT true,
  messages boolean DEFAULT true,
  contract_updates boolean DEFAULT true,
  proof_uploads boolean DEFAULT true,
  reviews boolean DEFAULT true,
  system_notifications boolean DEFAULT true,
  email_notifications boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on all tables
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policies for notifications
CREATE POLICY "users_can_view_own_notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "users_can_update_own_notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_can_delete_own_notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Policies for user messages
CREATE POLICY "users_can_view_their_messages"
  ON user_messages FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "users_can_send_messages"
  ON user_messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "users_can_update_their_messages"
  ON user_messages FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid())
  WITH CHECK (sender_id = auth.uid() OR recipient_id = auth.uid());

-- Policies for notification preferences
CREATE POLICY "users_can_manage_own_preferences"
  ON notification_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

CREATE INDEX IF NOT EXISTS idx_user_messages_sender_id ON user_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_user_messages_recipient_id ON user_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_user_messages_read ON user_messages(read);
CREATE INDEX IF NOT EXISTS idx_user_messages_created_at ON user_messages(created_at);

-- Grant permissions
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON user_messages TO authenticated;
GRANT ALL ON notification_preferences TO authenticated;

-- Enable real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE user_messages;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_data jsonb DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  notification_id uuid;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_data)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ language plpgsql security definer;

-- Function to handle job application notifications
CREATE OR REPLACE FUNCTION handle_job_application_notification()
RETURNS trigger AS $$
DECLARE
  job_owner_id uuid;
  job_title text;
  applicant_name text;
BEGIN
  -- Get job owner and title
  SELECT user_id, title INTO job_owner_id, job_title
  FROM jobs WHERE id = NEW.job_id;
  
  -- Get applicant name
  SELECT full_name INTO applicant_name
  FROM profiles WHERE id = NEW.applicant_id;
  
  -- Create notification for job owner
  PERFORM create_notification(
    job_owner_id,
    'gig_application',
    'New Gig Application',
    applicant_name || ' applied to your gig "' || job_title || '"',
    jsonb_build_object(
      'job_id', NEW.job_id,
      'application_id', NEW.id,
      'applicant_id', NEW.applicant_id
    )
  );
  
  RETURN NEW;
END;
$$ language plpgsql security definer;

-- Function to handle contract message notifications
CREATE OR REPLACE FUNCTION handle_contract_message_notification()
RETURNS trigger AS $$
DECLARE
  contract_buyer_id uuid;
  contract_seller_id uuid;
  sender_name text;
  contract_title text;
  recipient_id uuid;
BEGIN
  -- Get contract details
  SELECT buyer_id, seller_id, title 
  INTO contract_buyer_id, contract_seller_id, contract_title
  FROM contracts WHERE id = NEW.contract_id;
  
  -- Get sender name
  SELECT full_name INTO sender_name
  FROM profiles WHERE id = NEW.user_id;
  
  -- Determine recipient (the other party in the contract)
  IF NEW.user_id = contract_buyer_id THEN
    recipient_id := contract_seller_id;
  ELSE
    recipient_id := contract_buyer_id;
  END IF;
  
  -- Create notification for recipient
  PERFORM create_notification(
    recipient_id,
    'message',
    'New Contract Message',
    sender_name || ' sent a message about "' || contract_title || '"',
    jsonb_build_object(
      'contract_id', NEW.contract_id,
      'message_id', NEW.id,
      'sender_id', NEW.user_id
    )
  );
  
  RETURN NEW;
END;
$$ language plpgsql security definer;

-- Function to handle proof upload notifications
CREATE OR REPLACE FUNCTION handle_proof_upload_notification()
RETURNS trigger AS $$
DECLARE
  contract_buyer_id uuid;
  contract_seller_id uuid;
  uploader_name text;
  contract_title text;
  recipient_id uuid;
BEGIN
  -- Get contract details
  SELECT buyer_id, seller_id, title 
  INTO contract_buyer_id, contract_seller_id, contract_title
  FROM contracts WHERE id = NEW.contract_id;
  
  -- Get uploader name
  SELECT full_name INTO uploader_name
  FROM profiles WHERE id = NEW.uploaded_by;
  
  -- Determine recipient (the other party in the contract)
  IF NEW.uploaded_by = contract_buyer_id THEN
    recipient_id := contract_seller_id;
  ELSE
    recipient_id := contract_buyer_id;
  END IF;
  
  -- Create notification for recipient
  PERFORM create_notification(
    recipient_id,
    'proof_uploaded',
    'New Proof Uploaded',
    uploader_name || ' uploaded proof for "' || contract_title || '"',
    jsonb_build_object(
      'contract_id', NEW.contract_id,
      'proof_id', NEW.id,
      'uploader_id', NEW.uploaded_by,
      'proof_type', NEW.proof_type
    )
  );
  
  RETURN NEW;
END;
$$ language plpgsql security definer;

-- Function to handle user message notifications
CREATE OR REPLACE FUNCTION handle_user_message_notification()
RETURNS trigger AS $$
DECLARE
  sender_name text;
BEGIN
  -- Get sender name
  SELECT full_name INTO sender_name
  FROM profiles WHERE id = NEW.sender_id;
  
  -- Create notification for recipient
  PERFORM create_notification(
    NEW.recipient_id,
    'message',
    'New Message',
    sender_name || ' sent you a message' || 
    CASE 
      WHEN NEW.subject IS NOT NULL THEN ': ' || NEW.subject
      ELSE ''
    END,
    jsonb_build_object(
      'message_id', NEW.id,
      'sender_id', NEW.sender_id,
      'message_type', NEW.message_type
    )
  );
  
  RETURN NEW;
END;
$$ language plpgsql security definer;

-- Create triggers
DROP TRIGGER IF EXISTS job_application_notification_trigger ON job_applications;
CREATE TRIGGER job_application_notification_trigger
  AFTER INSERT ON job_applications
  FOR EACH ROW EXECUTE FUNCTION handle_job_application_notification();

DROP TRIGGER IF EXISTS contract_message_notification_trigger ON contract_messages;
CREATE TRIGGER contract_message_notification_trigger
  AFTER INSERT ON contract_messages
  FOR EACH ROW EXECUTE FUNCTION handle_contract_message_notification();

DROP TRIGGER IF EXISTS proof_upload_notification_trigger ON contract_proofs;
CREATE TRIGGER proof_upload_notification_trigger
  AFTER INSERT ON contract_proofs
  FOR EACH ROW EXECUTE FUNCTION handle_proof_upload_notification();

DROP TRIGGER IF EXISTS user_message_notification_trigger ON user_messages;
CREATE TRIGGER user_message_notification_trigger
  AFTER INSERT ON user_messages
  FOR EACH ROW EXECUTE FUNCTION handle_user_message_notification();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION handle_job_application_notification TO authenticated;
GRANT EXECUTE ON FUNCTION handle_contract_message_notification TO authenticated;
GRANT EXECUTE ON FUNCTION handle_proof_upload_notification TO authenticated;
GRANT EXECUTE ON FUNCTION handle_user_message_notification TO authenticated;

-- Create default notification preferences for existing users
INSERT INTO notification_preferences (user_id)
SELECT id FROM profiles
WHERE id NOT IN (SELECT user_id FROM notification_preferences)
ON CONFLICT (user_id) DO NOTHING;