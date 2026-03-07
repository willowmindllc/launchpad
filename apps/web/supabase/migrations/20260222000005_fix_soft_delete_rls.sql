-- Fix: RLS update policy needs to allow setting deleted_at on active tasks
-- The previous migration split SELECT into two policies (active vs deleted)
-- but the UPDATE policy's WITH CHECK may block setting deleted_at to non-null

-- Drop and recreate update policy to allow soft-delete updates
DROP POLICY IF EXISTS "Project members can update tasks" ON tasks;

CREATE POLICY "Project members can update tasks" ON tasks FOR UPDATE USING (
  can_access_project(project_id, auth.uid())
) WITH CHECK (
  can_access_project(project_id, auth.uid())
);

-- Also ensure DELETE policy exists for permanent deletion from trash
DROP POLICY IF EXISTS "Project members can delete tasks" ON tasks;

CREATE POLICY "Project members can delete tasks" ON tasks FOR DELETE USING (
  can_access_project(project_id, auth.uid())
);
