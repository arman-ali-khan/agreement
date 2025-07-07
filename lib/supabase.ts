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
      job_categories: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          icon: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          icon?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          icon?: string | null;
          created_at?: string;
        };
      };
      jobs: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          category_id: string | null;
          description: string;
          pricing_type: 'hourly' | 'fixed' | 'package';
          base_price: number | null;
          hourly_rate: number | null;
          delivery_time: number | null;
          revisions_included: number;
          requirements: string | null;
          terms_conditions: string | null;
          status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
          featured: boolean;
          views_count: number;
          applications_count: number;
          rating: number;
          reviews_count: number;
          availability_hours: any | null;
          response_time: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          category_id?: string | null;
          description: string;
          pricing_type: 'hourly' | 'fixed' | 'package';
          base_price?: number | null;
          hourly_rate?: number | null;
          delivery_time?: number | null;
          revisions_included?: number;
          requirements?: string | null;
          terms_conditions?: string | null;
          status?: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
          featured?: boolean;
          views_count?: number;
          applications_count?: number;
          rating?: number;
          reviews_count?: number;
          availability_hours?: any | null;
          response_time?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          category_id?: string | null;
          description?: string;
          pricing_type?: 'hourly' | 'fixed' | 'package';
          base_price?: number | null;
          hourly_rate?: number | null;
          delivery_time?: number | null;
          revisions_included?: number;
          requirements?: string | null;
          terms_conditions?: string | null;
          status?: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
          featured?: boolean;
          views_count?: number;
          applications_count?: number;
          rating?: number;
          reviews_count?: number;
          availability_hours?: any | null;
          response_time?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      job_skills: {
        Row: {
          id: string;
          job_id: string;
          skill_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          skill_name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          skill_name?: string;
          created_at?: string;
        };
      };
      job_portfolio_items: {
        Row: {
          id: string;
          job_id: string;
          title: string;
          description: string | null;
          image_url: string | null;
          file_url: string | null;
          file_type: 'image' | 'video' | 'document' | 'link' | null;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          title: string;
          description?: string | null;
          image_url?: string | null;
          file_url?: string | null;
          file_type?: 'image' | 'video' | 'document' | 'link' | null;
          order_index?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          title?: string;
          description?: string | null;
          image_url?: string | null;
          file_url?: string | null;
          file_type?: 'image' | 'video' | 'document' | 'link' | null;
          order_index?: number;
          created_at?: string;
        };
      };
      job_packages: {
        Row: {
          id: string;
          job_id: string;
          name: string;
          description: string;
          price: number;
          delivery_time: number;
          revisions_included: number;
          features: any | null;
          is_popular: boolean;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          name: string;
          description: string;
          price: number;
          delivery_time: number;
          revisions_included?: number;
          features?: any | null;
          is_popular?: boolean;
          order_index?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          name?: string;
          description?: string;
          price?: number;
          delivery_time?: number;
          revisions_included?: number;
          features?: any | null;
          is_popular?: boolean;
          order_index?: number;
          created_at?: string;
        };
      };
      job_applications: {
        Row: {
          id: string;
          job_id: string;
          applicant_id: string;
          package_id: string | null;
          message: string;
          budget: number | null;
          timeline: string | null;
          status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          applicant_id: string;
          package_id?: string | null;
          message: string;
          budget?: number | null;
          timeline?: string | null;
          status?: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          applicant_id?: string;
          package_id?: string | null;
          message?: string;
          budget?: number | null;
          timeline?: string | null;
          status?: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
          created_at?: string;
          updated_at?: string;
        };
      };
      job_reviews: {
        Row: {
          id: string;
          job_id: string;
          application_id: string;
          reviewer_id: string;
          rating: number;
          review_text: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          application_id: string;
          reviewer_id: string;
          rating: number;
          review_text?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          application_id?: string;
          reviewer_id?: string;
          rating?: number;
          review_text?: string | null;
          created_at?: string;
        };
      };
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
      contract_messages: {
        Row: {
          id: string;
          contract_id: string;
          user_id: string;
          message: string;
          message_type: 'text' | 'file' | 'system';
          file_url: string | null;
          message_status: 'sent' | 'delivered' | 'read';
          reply_to_id: string | null;
          edited_at: string | null;
          file_type: 'image' | 'document' | 'video' | 'audio' | null;
          file_size: number | null;
          thumbnail_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          contract_id: string;
          user_id: string;
          message: string;
          message_type?: 'text' | 'file' | 'system';
          file_url?: string | null;
          message_status?: 'sent' | 'delivered' | 'read';
          reply_to_id?: string | null;
          edited_at?: string | null;
          file_type?: 'image' | 'document' | 'video' | 'audio' | null;
          file_size?: number | null;
          thumbnail_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          contract_id?: string;
          user_id?: string;
          message?: string;
          message_type?: 'text' | 'file' | 'system';
          file_url?: string | null;
          message_status?: 'sent' | 'delivered' | 'read';
          reply_to_id?: string | null;
          edited_at?: string | null;
          file_type?: 'image' | 'document' | 'video' | 'audio' | null;
          file_size?: number | null;
          thumbnail_url?: string | null;
          created_at?: string;
        };
      };
      contract_proofs: {
        Row: {
          id: string;
          contract_id: string;
          uploaded_by: string;
          proof_type: 'delivery' | 'payment' | 'completion' | 'other';
          file_url: string;
          file_name: string;
          description: string | null;
          status: 'pending' | 'approved' | 'rejected';
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          contract_id: string;
          uploaded_by: string;
          proof_type: 'delivery' | 'payment' | 'completion' | 'other';
          file_url: string;
          file_name: string;
          description?: string | null;
          status?: 'pending' | 'approved' | 'rejected';
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          contract_id?: string;
          uploaded_by?: string;
          proof_type?: 'delivery' | 'payment' | 'completion' | 'other';
          file_url?: string;
          file_name?: string;
          description?: string | null;
          status?: 'pending' | 'approved' | 'rejected';
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
      };
      contract_message_reactions: {
        Row: {
          id: string;
          message_id: string;
          user_id: string;
          reaction: '👍' | '👎' | '❤️' | '😊' | '😢' | '😮' | '😡';
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          user_id: string;
          reaction: '👍' | '👎' | '❤️' | '😊' | '😢' | '😮' | '😡';
          created_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          user_id?: string;
          reaction?: '👍' | '👎' | '❤️' | '😊' | '😢' | '😮' | '😡';
          created_at?: string;
        };
      };
      admin_chat_sessions: {
        Row: {
          id: string;
          contract_id: string;
          admin_id: string;
          joined_at: string;
          left_at: string | null;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          contract_id: string;
          admin_id: string;
          joined_at?: string;
          left_at?: string | null;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          contract_id?: string;
          admin_id?: string;
          joined_at?: string;
          left_at?: string | null;
          is_active?: boolean;
        };
      };
    };
  };
};