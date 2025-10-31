import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      keyboard_models: {
        Row: {
          id: string;
          name: string;
          layout_type: string;
          key_count: number;
          description: string | null;
          created_at: string;
        };
      };
      presets: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          creator_id: string;
          keyboard_model_id: string;
          thumbnail_url: string | null;
          rgb_config: any;
          keymap_config: any;
          macro_config: any;
          visibility: 'public' | 'unlisted' | 'private';
          download_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          creator_id: string;
          keyboard_model_id: string;
          thumbnail_url?: string | null;
          rgb_config: any;
          keymap_config?: any;
          macro_config?: any;
          visibility?: 'public' | 'unlisted' | 'private';
          download_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          creator_id?: string;
          keyboard_model_id?: string;
          thumbnail_url?: string | null;
          rgb_config?: any;
          keymap_config?: any;
          macro_config?: any;
          visibility?: 'public' | 'unlisted' | 'private';
          download_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      ratings: {
        Row: {
          id: string;
          user_id: string;
          preset_id: string;
          vote: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          preset_id: string;
          vote: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          preset_id?: string;
          vote?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      comments: {
        Row: {
          id: string;
          user_id: string;
          preset_id: string;
          parent_id: string | null;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          preset_id: string;
          parent_id?: string | null;
          content: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          preset_id?: string;
          parent_id?: string | null;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      favorites: {
        Row: {
          id: string;
          user_id: string;
          preset_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          preset_id: string;
          created_at?: string;
        };
      };
      follows: {
        Row: {
          id: string;
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
      };
    };
    Views: {
      preset_scores: {
        Row: {
          preset_id: string;
          score: number;
          upvotes: number;
          downvotes: number;
        };
      };
    };
  };
};
