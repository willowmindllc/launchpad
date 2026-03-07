-- LP-049: Add editor role — separate from admin
-- Editors can edit tasks but CANNOT invite or manage members

-- 1. Add 'editor' to the member_role enum
-- Functions using the new value must be in a separate transaction
ALTER TYPE member_role ADD VALUE IF NOT EXISTS 'editor' AFTER 'admin';
