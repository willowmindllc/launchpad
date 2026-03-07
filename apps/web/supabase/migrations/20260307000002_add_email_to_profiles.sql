-- LP-048: Add email column to profiles for display in share/members UI
-- Email is sourced from auth.users and kept in sync via trigger

-- 1. Add email column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;

-- 2. Backfill existing profiles from auth.users
UPDATE profiles
SET email = u.email
FROM auth.users u
WHERE profiles.id = u.id
  AND profiles.email IS NULL;

-- 3. Update trigger to include email on new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url, email)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.email
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
