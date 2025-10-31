/*
  # Add User Account Deletion Function

  ## Purpose
  Provides a secure way for authenticated users to delete their own accounts.

  ## New Functions
  
  ### `delete_user_account()`
  - Allows authenticated users to delete their own account from auth.users
  - Automatically triggers CASCADE deletion of all related data:
    - Profile (profiles table)
    - All presets created by the user
    - All ratings by the user
    - All comments by the user
    - All favorites by the user
    - All follow relationships
  - Can only be called by authenticated users
  - Only deletes the calling user's own account (security enforced)

  ## Security
  - Function uses SECURITY DEFINER to allow deletion from auth.users
  - Only authenticated users can call this function
  - User can only delete their own account (auth.uid() check)
  - All related data is automatically deleted via CASCADE constraints
*/

-- Create function to delete user account
CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow authenticated users to delete their own account
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete the user from auth.users
  -- This will cascade delete all related data due to ON DELETE CASCADE constraints:
  -- - profiles
  -- - presets
  -- - ratings
  -- - comments
  -- - favorites
  -- - follows
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;
