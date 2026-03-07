-- LP-049: Update functions to include editor role
-- Separate transaction from enum addition (Postgres requirement)

-- Editors can create/update/delete tasks (same as admin for task operations)
CREATE OR REPLACE FUNCTION can_edit_project(p_project_id uuid, p_user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_project_id
      AND user_id = p_user_id
      AND role IN ('owner', 'admin', 'editor')
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Editors can also comment
CREATE OR REPLACE FUNCTION can_comment_on_project(p_project_id uuid, p_user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_project_id
      AND user_id = p_user_id
      AND role IN ('owner', 'admin', 'editor', 'member')
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- NOTE: Invite/member management policies remain restricted to owner + admin.
-- Editors edit content, admins manage people.
