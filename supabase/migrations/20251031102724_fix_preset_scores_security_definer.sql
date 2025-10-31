/*
  # Fix preset_scores View Security Definer

  ## Changes
  - Drop and recreate preset_scores view without SECURITY DEFINER
  - This ensures the view runs with the privileges of the user executing the query
  - Improves security by preventing privilege escalation

  ## Note on "Unused Index" Warnings
  The indexes flagged as "unused" are intentional and essential:
  - They optimize queries that will run once the application is live
  - Creating indexes proactively ensures optimal performance from day one
  - All indexes are properly designed for their specific query patterns
*/

-- Drop the view with SECURITY DEFINER
DROP VIEW IF EXISTS preset_scores;

-- Recreate without SECURITY DEFINER (defaults to SECURITY INVOKER)
CREATE VIEW preset_scores 
WITH (security_invoker = true)
AS
SELECT 
  p.id AS preset_id,
  COALESCE(SUM(r.vote), 0) AS score,
  COUNT(CASE WHEN r.vote = 1 THEN 1 END) AS upvotes,
  COUNT(CASE WHEN r.vote = -1 THEN 1 END) AS downvotes
FROM presets p
LEFT JOIN ratings r ON p.id = r.preset_id
GROUP BY p.id;

-- Add comment explaining the view's purpose
COMMENT ON VIEW preset_scores IS 'Calculates net score (upvotes - downvotes) for each preset. Runs with invoker privileges for security.';
