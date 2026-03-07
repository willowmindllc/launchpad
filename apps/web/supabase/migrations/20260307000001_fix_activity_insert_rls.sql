-- WM-008 F-3: Restrict task_activity INSERT to project editors only
-- Previously open to all authed users (any user could insert fake activity)
-- The trigger (log_task_changes) runs as SECURITY DEFINER so it bypasses RLS,
-- but direct client inserts should be restricted.

DROP POLICY IF EXISTS "Users can insert activity" ON task_activity;
CREATE POLICY "Project editors can insert activity" ON task_activity FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = task_activity.task_id
      AND can_edit_project(t.project_id, auth.uid())
  )
);
