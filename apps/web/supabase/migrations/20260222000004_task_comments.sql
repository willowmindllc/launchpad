-- LP-026: Task Comments & PR Links

-- Task comments table
CREATE TABLE task_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Index for efficient comment loading
CREATE INDEX idx_task_comments_task_created ON task_comments(task_id, created_at);

-- RLS
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Users can read comments on tasks they can access (reuse existing helper)
CREATE POLICY "Users can view comments on accessible tasks" ON task_comments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = task_comments.task_id
      AND can_access_project(t.project_id, auth.uid())
  )
);

-- Users can insert their own comments on accessible tasks
CREATE POLICY "Users can create own comments" ON task_comments FOR INSERT WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = task_comments.task_id
      AND can_access_project(t.project_id, auth.uid())
  )
);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments" ON task_comments FOR DELETE USING (
  user_id = auth.uid()
);
