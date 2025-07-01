import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          phone: string | null;
          role: 'buyer' | 'seller' | 'admin';
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          phone?: string | null;
          role?: 'buyer' | 'seller' | 'admin';
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          phone?: string | null;
          role?: 'buyer' | 'seller' | 'admin';
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      contracts: {
        Row: {
          id: string;
          title: string;
          description: string;
          buyer_id: string;
          seller_id: string;
          terms: string;
          status: 'draft' | 'pending' | 'active' | 'fulfilled' | 'completed' | 'cancelled' | 'disputed';
          deadline: string;
          file_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          buyer_id: string;
          seller_id: string;
          terms: string;
          status?: 'draft' | 'pending' | 'active' | 'fulfilled' | 'completed' | 'cancelled' | 'disputed';
          deadline: string;
          file_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          buyer_id?: string;
          seller_id?: string;
          terms?: string;
          status?: 'draft' | 'pending' | 'active' | 'fulfilled' | 'completed' | 'cancelled' | 'disputed';
          deadline?: string;
          file_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      contract_events: {
        Row: {
          id: string;
          contract_id: string;
          user_id: string;
          action_type: 'created' | 'accepted' | 'declined' | 'fulfilled' | 'completed' | 'disputed' | 'uploaded_proof';
          notes: string | null;
          file_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          contract_id: string;
          user_id: string;
          action_type: 'created' | 'accepted' | 'declined' | 'fulfilled' | 'completed' | 'disputed' | 'uploaded_proof';
          notes?: string | null;
          file_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          contract_id?: string;
          user_id?: string;
          action_type?: 'created' | 'accepted' | 'declined' | 'fulfilled' | 'completed' | 'disputed' | 'uploaded_proof';
          notes?: string | null;
          file_url?: string | null;
          created_at?: string;
        };
      };
    };
  };
};