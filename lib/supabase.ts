import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Dummy values for development - replace with actual values when connecting to real Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'supabaseのURLが見つかりません. supabaseのURLとanonキーを設定してください.'
  );
}

export const supabase = createClientComponentClient();

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