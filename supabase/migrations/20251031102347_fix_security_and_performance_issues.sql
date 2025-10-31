/*
  # Fix Security and Performance Issues

  ## Changes Made

  ### 1. Missing Indexes for Foreign Keys
  - Add index on `comments.user_id` for foreign key performance
  - Add index on `presets.keyboard_model_id` for foreign key performance

  ### 2. RLS Policy Optimization
  - Replace all `auth.uid()` with `(select auth.uid())` to prevent re-evaluation per row
  - This significantly improves query performance at scale

  ### 3. Security Definer View Fix
  - Recreate `preset_scores` view without SECURITY DEFINER property

  ### 4. Function Search Path Fix
  - Add SECURITY INVOKER and set search_path for `update_updated_at_column` function

  ### 5. Note on Unused Indexes
  - The "unused" indexes are actually needed for future query optimization
  - They will be used as the database grows and queries are executed
  - Keeping them ensures optimal performance from day one
*/

-- Add missing indexes for foreign keys
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_presets_keyboard_model_id ON presets(keyboard_model_id);

-- Drop and recreate RLS policies with optimized auth.uid() calls

-- Profiles table policies
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- Presets table policies
DROP POLICY IF EXISTS "Public presets are viewable by everyone" ON presets;
CREATE POLICY "Public presets are viewable by everyone"
  ON presets FOR SELECT
  USING (visibility = 'public' OR creator_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create own presets" ON presets;
CREATE POLICY "Users can create own presets"
  ON presets FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = creator_id);

DROP POLICY IF EXISTS "Users can update own presets" ON presets;
CREATE POLICY "Users can update own presets"
  ON presets FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = creator_id)
  WITH CHECK ((select auth.uid()) = creator_id);

DROP POLICY IF EXISTS "Users can delete own presets" ON presets;
CREATE POLICY "Users can delete own presets"
  ON presets FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = creator_id);

-- Ratings table policies
DROP POLICY IF EXISTS "Authenticated users can create ratings" ON ratings;
CREATE POLICY "Authenticated users can create ratings"
  ON ratings FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own ratings" ON ratings;
CREATE POLICY "Users can update own ratings"
  ON ratings FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own ratings" ON ratings;
CREATE POLICY "Users can delete own ratings"
  ON ratings FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Comments table policies
DROP POLICY IF EXISTS "Authenticated users can create comments" ON comments;
CREATE POLICY "Authenticated users can create comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own comments" ON comments;
CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON comments;
CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Favorites table policies
DROP POLICY IF EXISTS "Favorites are viewable by owner" ON favorites;
CREATE POLICY "Favorites are viewable by owner"
  ON favorites FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create own favorites" ON favorites;
CREATE POLICY "Users can create own favorites"
  ON favorites FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own favorites" ON favorites;
CREATE POLICY "Users can delete own favorites"
  ON favorites FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Follows table policies
DROP POLICY IF EXISTS "Users can create own follows" ON follows;
CREATE POLICY "Users can create own follows"
  ON follows FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = follower_id);

DROP POLICY IF EXISTS "Users can delete own follows" ON follows;
CREATE POLICY "Users can delete own follows"
  ON follows FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = follower_id);

-- Fix Security Definer View
-- Drop and recreate without SECURITY DEFINER
DROP VIEW IF EXISTS preset_scores;
CREATE VIEW preset_scores AS
SELECT 
  p.id AS preset_id,
  COALESCE(SUM(r.vote), 0) AS score,
  COUNT(CASE WHEN r.vote = 1 THEN 1 END) AS upvotes,
  COUNT(CASE WHEN r.vote = -1 THEN 1 END) AS downvotes
FROM presets p
LEFT JOIN ratings r ON p.id = r.preset_id
GROUP BY p.id;

-- Fix Function Search Path
-- Drop function with CASCADE to remove dependent triggers
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Recreate function with SECURITY INVOKER and explicit search_path
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate all triggers that depend on the function
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

-- Add comments explaining why indexes appear "unused"
COMMENT ON INDEX idx_presets_creator_id IS 'Required for efficient user preset queries';
COMMENT ON INDEX idx_presets_created_at IS 'Required for sorting presets by date';
COMMENT ON INDEX idx_presets_visibility IS 'Required for filtering public/private presets';
COMMENT ON INDEX idx_ratings_preset_id IS 'Required for calculating preset scores';
COMMENT ON INDEX idx_ratings_user_id IS 'Required for user voting history queries';
COMMENT ON INDEX idx_comments_preset_id IS 'Required for loading preset comments';
COMMENT ON INDEX idx_comments_parent_id IS 'Required for threaded comment queries';
COMMENT ON INDEX idx_comments_created_at IS 'Required for sorting comments by date';
COMMENT ON INDEX idx_favorites_user_id IS 'Required for user favorites queries';
COMMENT ON INDEX idx_favorites_preset_id IS 'Required for preset favorite count';
COMMENT ON INDEX idx_follows_follower_id IS 'Required for follower queries';
COMMENT ON INDEX idx_follows_following_id IS 'Required for following queries';
