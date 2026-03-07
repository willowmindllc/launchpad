-- TF-002: Board Sharing
-- project_invites table, role-based helper functions, updated RLS policies

-- ── project_invites table ──
DO $$ BEGIN
  CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'declined');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS project_invites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  invited_email text NOT NULL,
  role member_role DEFAULT 'viewer' NOT NULL,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status invite_status DEFAULT 'pending' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  accepted_at timestamptz,
  UNIQUE (project_id, invited_email)
);

CREATE INDEX IF NOT EXISTS idx_project_invites_email ON project_invites(invited_email);
CREATE INDEX IF NOT EXISTS idx_project_invites_project ON project_invites(project_id);

ALTER TABLE project_invites ENABLE ROW LEVEL SECURITY;

-- Owners/admins can view invites for their projects
CREATE POLICY "Admins can view invites" ON project_invites FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = project_invites.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin')
  )
);

-- Owners/admins can create invites
CREATE POLICY "Admins can create invites" ON project_invites FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = project_invites.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin')
  )
);

-- Owners/admins can update invites (e.g. mark declined)
CREATE POLICY "Admins can update invites" ON project_invites FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = project_invites.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin')
  )
);

-- Owners/admins can delete invites
CREATE POLICY "Admins can delete invites" ON project_invites FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = project_invites.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin')
  )
);

-- ── Update project_members policies: allow admins (not just owners) ──
DROP POLICY IF EXISTS "Owners can manage members" ON project_members;
DROP POLICY IF EXISTS "Owners can remove members" ON project_members;

CREATE POLICY "Admins can add members" ON project_members FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Admins can remove members" ON project_members FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin')
  )
);

-- Add UPDATE policy for project_members (needed for role changes)
CREATE POLICY "Admins can update member roles" ON project_members FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin')
  )
);

-- ── Role-based helper functions ──

CREATE OR REPLACE FUNCTION can_edit_project(p_project_id uuid, p_user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_project_id
      AND user_id = p_user_id
      AND role IN ('owner', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION can_comment_on_project(p_project_id uuid, p_user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_project_id
      AND user_id = p_user_id
      AND role IN ('owner', 'admin', 'member')
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- ── Update task INSERT/UPDATE/DELETE policies to use can_edit_project ──
DROP POLICY IF EXISTS "Project members can create tasks" ON tasks;
DROP POLICY IF EXISTS "Project members can update tasks" ON tasks;
DROP POLICY IF EXISTS "Project members can delete tasks" ON tasks;

CREATE POLICY "Editors can create tasks" ON tasks FOR INSERT WITH CHECK (
  can_edit_project(project_id, auth.uid())
);

CREATE POLICY "Editors can update tasks" ON tasks FOR UPDATE USING (
  can_edit_project(project_id, auth.uid())
);

CREATE POLICY "Editors can delete tasks" ON tasks FOR DELETE USING (
  can_edit_project(project_id, auth.uid())
);

-- ── Update comment INSERT policy to use can_comment_on_project ──
DROP POLICY IF EXISTS "Users can create own comments" ON task_comments;

CREATE POLICY "Commenters can create comments" ON task_comments FOR INSERT WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = task_comments.task_id
      AND can_comment_on_project(t.project_id, auth.uid())
  )
);

-- ── Accept pending invites function ──
CREATE OR REPLACE FUNCTION accept_pending_invites(p_user_id uuid, p_email text)
RETURNS void AS $$
DECLARE
  inv RECORD;
BEGIN
  FOR inv IN
    SELECT id, project_id, role
    FROM project_invites
    WHERE invited_email = lower(p_email)
      AND status = 'pending'
  LOOP
    INSERT INTO project_members (project_id, user_id, role)
    VALUES (inv.project_id, p_user_id, inv.role)
    ON CONFLICT (project_id, user_id) DO NOTHING;

    UPDATE project_invites
    SET status = 'accepted', accepted_at = now()
    WHERE id = inv.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
