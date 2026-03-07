-- LP-027: Soft Delete & Trash

-- Add deleted_at column to tasks
ALTER TABLE tasks ADD COLUMN deleted_at timestamptz DEFAULT NULL;

-- Index for filtering deleted/active tasks
CREATE INDEX idx_tasks_deleted_at ON tasks(deleted_at);

-- Update the existing select policy to exclude soft-deleted tasks by default
DROP POLICY IF EXISTS "Project members can view tasks" ON tasks;

CREATE POLICY "Project members can view tasks" ON tasks FOR SELECT USING (
  can_access_project(project_id, auth.uid()) AND deleted_at IS NULL
);

-- Separate policy for viewing deleted tasks (trash view)
CREATE POLICY "Project members can view deleted tasks" ON tasks FOR SELECT USING (
  can_access_project(project_id, auth.uid()) AND deleted_at IS NOT NULL
);
