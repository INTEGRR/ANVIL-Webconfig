/*
  # Initial Database Schema for Anvil Native Keyboard Platform

  ## Overview
  This migration creates the foundational database schema for the keyboard configuration platform,
  including user authentication, preset management, community ratings, and comments.

  ## New Tables

  ### 1. `profiles`
  - `id` (uuid, primary key, references auth.users)
  - `username` (text, unique, required) - Display name for the user
  - `avatar_url` (text, nullable) - Profile picture URL
  - `bio` (text, nullable) - User biography
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last profile update timestamp

  ### 2. `keyboard_models`
  - `id` (uuid, primary key)
  - `name` (text, required) - Keyboard model name
  - `layout_type` (text, required) - Layout type (e.g., "75_iso")
  - `key_count` (integer, required) - Total number of keys
  - `description` (text, nullable) - Model description
  - `created_at` (timestamptz) - Record creation timestamp

  ### 3. `presets`
  - `id` (uuid, primary key)
  - `name` (text, required) - Preset display name
  - `description` (text, nullable) - Detailed preset description
  - `creator_id` (uuid, required, references profiles) - User who created preset
  - `keyboard_model_id` (uuid, required, references keyboard_models) - Target keyboard
  - `thumbnail_url` (text, nullable) - Preview image URL
  - `rgb_config` (jsonb, required) - RGB lighting configuration
  - `keymap_config` (jsonb, nullable) - Key mapping configuration
  - `macro_config` (jsonb, nullable) - Macro definitions
  - `visibility` (text, required, default 'public') - public, unlisted, or private
  - `download_count` (integer, default 0) - Number of times preset was loaded
  - `created_at` (timestamptz) - Preset creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 4. `ratings`
  - `id` (uuid, primary key)
  - `user_id` (uuid, required, references profiles) - User who voted
  - `preset_id` (uuid, required, references presets) - Preset being rated
  - `vote` (smallint, required) - Vote value: 1 for upvote, -1 for downvote
  - `created_at` (timestamptz) - Vote timestamp
  - `updated_at` (timestamptz) - Vote change timestamp
  - Unique constraint on (user_id, preset_id) to prevent duplicate votes

  ### 5. `comments`
  - `id` (uuid, primary key)
  - `user_id` (uuid, required, references profiles) - Comment author
  - `preset_id` (uuid, required, references presets) - Preset being commented on
  - `parent_id` (uuid, nullable, references comments) - Parent comment for threading
  - `content` (text, required) - Comment text content
  - `created_at` (timestamptz) - Comment creation timestamp
  - `updated_at` (timestamptz) - Last edit timestamp

  ### 6. `favorites`
  - `id` (uuid, primary key)
  - `user_id` (uuid, required, references profiles) - User who favorited
  - `preset_id` (uuid, required, references presets) - Favorited preset
  - `created_at` (timestamptz) - Favorite timestamp
  - Unique constraint on (user_id, preset_id) to prevent duplicates

  ### 7. `follows`
  - `id` (uuid, primary key)
  - `follower_id` (uuid, required, references profiles) - User who is following
  - `following_id` (uuid, required, references profiles) - User being followed
  - `created_at` (timestamptz) - Follow timestamp
  - Unique constraint on (follower_id, following_id)

  ## Security
  - RLS enabled on all tables
  - Public read access for public presets
  - Users can only modify their own content
  - Authenticated users required for creating content

  ## Indexes
  - Indexed on preset creator_id for fast user preset queries
  - Indexed on preset created_at for sorting by new
  - Indexed on ratings for score calculation
  - Indexed on comments preset_id for fast comment loading
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  avatar_url text,
  bio text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create keyboard_models table
CREATE TABLE IF NOT EXISTS keyboard_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  layout_type text NOT NULL,
  key_count integer NOT NULL,
  description text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE keyboard_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Keyboard models are viewable by everyone"
  ON keyboard_models FOR SELECT
  USING (true);

-- Insert Anvil Native as the first keyboard model
INSERT INTO keyboard_models (name, layout_type, key_count, description)
VALUES (
  'Anvil Native',
  '75_iso',
  85,
  'Premium 75% mechanical keyboard with ISO layout and per-key RGB lighting'
) ON CONFLICT DO NOTHING;

-- Create presets table
CREATE TABLE IF NOT EXISTS presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  creator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  keyboard_model_id uuid NOT NULL REFERENCES keyboard_models(id) ON DELETE CASCADE,
  thumbnail_url text,
  rgb_config jsonb NOT NULL,
  keymap_config jsonb DEFAULT '{}',
  macro_config jsonb DEFAULT '{}',
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'unlisted', 'private')),
  download_count integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public presets are viewable by everyone"
  ON presets FOR SELECT
  USING (visibility = 'public' OR creator_id = auth.uid());

CREATE POLICY "Users can create own presets"
  ON presets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update own presets"
  ON presets FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can delete own presets"
  ON presets FOR DELETE
  TO authenticated
  USING (auth.uid() = creator_id);

CREATE INDEX IF NOT EXISTS idx_presets_creator_id ON presets(creator_id);
CREATE INDEX IF NOT EXISTS idx_presets_created_at ON presets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_presets_visibility ON presets(visibility);

-- Create ratings table
CREATE TABLE IF NOT EXISTS ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  preset_id uuid NOT NULL REFERENCES presets(id) ON DELETE CASCADE,
  vote smallint NOT NULL CHECK (vote IN (-1, 1)),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, preset_id)
);

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ratings are viewable by everyone"
  ON ratings FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create ratings"
  ON ratings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ratings"
  ON ratings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ratings"
  ON ratings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ratings_preset_id ON ratings(preset_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings(user_id);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  preset_id uuid NOT NULL REFERENCES presets(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are viewable by everyone"
  ON comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_comments_preset_id ON comments(preset_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- Create favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  preset_id uuid NOT NULL REFERENCES presets(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, preset_id)
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Favorites are viewable by owner"
  ON favorites FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own favorites"
  ON favorites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
  ON favorites FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_preset_id ON favorites(preset_id);

-- Create follows table
CREATE TABLE IF NOT EXISTS follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Follows are viewable by everyone"
  ON follows FOR SELECT
  USING (true);

CREATE POLICY "Users can create own follows"
  ON follows FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete own follows"
  ON follows FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);

CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_presets_updated_at
  BEFORE UPDATE ON presets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ratings_updated_at
  BEFORE UPDATE ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create view for preset scores (upvotes - downvotes)
CREATE OR REPLACE VIEW preset_scores AS
SELECT 
  p.id AS preset_id,
  COALESCE(SUM(r.vote), 0) AS score,
  COUNT(CASE WHEN r.vote = 1 THEN 1 END) AS upvotes,
  COUNT(CASE WHEN r.vote = -1 THEN 1 END) AS downvotes
FROM presets p
LEFT JOIN ratings r ON p.id = r.preset_id
GROUP BY p.id;
