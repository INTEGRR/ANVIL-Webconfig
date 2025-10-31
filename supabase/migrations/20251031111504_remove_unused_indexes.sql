/*
  # Remove Unused Database Indexes

  1. Performance Optimization
    - Drops 10 unused indexes that are not being utilized
    - Reduces storage overhead
    - Improves write performance (INSERT/UPDATE/DELETE operations)
  
  2. Removed Indexes
    - `idx_comments_user_id` - User-based comment queries not used
    - `idx_comments_preset_id` - Preset-based comment queries not used
    - `idx_comments_created_at` - Time-based comment sorting not used
    - `idx_presets_keyboard_model_id` - Model-based filtering not used
    - `idx_presets_created_at` - Time-based preset sorting not used
    - `idx_ratings_user_id` - User-based rating queries not used
    - `idx_favorites_user_id` - User-based favorite queries not used
    - `idx_favorites_preset_id` - Preset-based favorite queries not used
    - `idx_follows_follower_id` - Follower queries not used
    - `idx_follows_following_id` - Following queries not used
  
  3. Notes
    - These indexes were identified as unused by Supabase's performance monitoring
    - Primary keys and unique constraints remain intact
    - Can be recreated later if needed for new features
*/

DROP INDEX IF EXISTS idx_comments_user_id;
DROP INDEX IF EXISTS idx_comments_preset_id;
DROP INDEX IF EXISTS idx_comments_created_at;
DROP INDEX IF EXISTS idx_presets_keyboard_model_id;
DROP INDEX IF EXISTS idx_presets_created_at;
DROP INDEX IF EXISTS idx_ratings_user_id;
DROP INDEX IF EXISTS idx_favorites_user_id;
DROP INDEX IF EXISTS idx_favorites_preset_id;
DROP INDEX IF EXISTS idx_follows_follower_id;
DROP INDEX IF EXISTS idx_follows_following_id;
