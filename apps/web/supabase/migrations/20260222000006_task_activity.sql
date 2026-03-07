-- LP-028: Task Activity Log & Edit History

-- Activity log table
CREATE TABLE task_activity (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL, -- title_changed, status_changed, priority_changed, description_changed, created, restored, trashed
  old_value text,
  new_value text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_task_activity_task_created ON task_activity(task_id, created_at);

-- RLS
ALTER TABLE task_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view activity on accessible tasks" ON task_activity;
CREATE POLICY "Users can view activity on accessible tasks" ON task_activity FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = task_activity.task_id
      AND can_access_project(t.project_id, auth.uid())
  )
);

-- Allow inserts from authenticated users (trigger runs as definer, but client inserts need this too)
DROP POLICY IF EXISTS "Users can insert activity" ON task_activity;
CREATE POLICY "Users can insert activity" ON task_activity FOR INSERT WITH CHECK (true);

-- Trigger function to auto-log changes
CREATE OR REPLACE FUNCTION log_task_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Title changed
  IF OLD.title IS DISTINCT FROM NEW.title THEN
    INSERT INTO task_activity (task_id, user_id, action, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'title_changed', OLD.title, NEW.title);
  END IF;

  -- Status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO task_activity (task_id, user_id, action, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'status_changed', OLD.status, NEW.status);
  END IF;

  -- Priority changed
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO task_activity (task_id, user_id, action, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'priority_changed', OLD.priority, NEW.priority);
  END IF;

  -- Description changed
  IF OLD.description IS DISTINCT FROM NEW.description THEN
    INSERT INTO task_activity (task_id, user_id, action, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'description_changed', 
      LEFT(COALESCE(OLD.description, ''), 100),
      LEFT(COALESCE(NEW.description, ''), 100));
  END IF;

  -- Soft deleted (trashed)
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    INSERT INTO task_activity (task_id, user_id, action, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'trashed', NULL, NULL);
  END IF;

  -- Restored from trash
  IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
    INSERT INTO task_activity (task_id, user_id, action, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'restored', NULL, NULL);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger
DROP TRIGGER IF EXISTS task_changes_trigger ON tasks;
CREATE TRIGGER task_changes_trigger
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_task_changes();
