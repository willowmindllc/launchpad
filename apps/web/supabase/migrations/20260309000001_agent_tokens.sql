-- Agent API tokens for AI agent integration
CREATE TABLE agent_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  permissions TEXT[] NOT NULL DEFAULT '{read,write}',
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_tokens_project ON agent_tokens(project_id);
CREATE INDEX idx_agent_tokens_hash ON agent_tokens(token_hash);

ALTER TABLE agent_tokens ENABLE ROW LEVEL SECURITY;

-- Only project owners and admins can manage agent tokens
CREATE POLICY "Project owners and admins can manage agent tokens"
  ON agent_tokens FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = agent_tokens.project_id
      AND p.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = agent_tokens.project_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = agent_tokens.project_id
      AND p.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = agent_tokens.project_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'admin'
    )
  );
