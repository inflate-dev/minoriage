import { createClient } from '@supabase/supabase-js';

// Dummy values for development - replace with actual values when connecting to real Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy_anon_key_placeholder';

export const supabase = createClient(supabaseUrl, supabaseKey);

export type Database = {
  public: {
    Tables: {
      detection_results: {
        Row: {
          id: string;
          user_id: string;
          image_url: string;
          detections: Json;
          total_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          image_url: string;
          detections: Json;
          total_count: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          image_url?: string;
          detections?: Json;
          total_count?: number;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
};

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];