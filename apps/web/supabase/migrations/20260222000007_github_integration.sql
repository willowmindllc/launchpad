-- LP-002: GitHub Integration tables
-- github_connections: one per user, stores OAuth token
-- project_github_links: links a project to a GitHub repo
-- tasks: add github_issue_number and github_issue_url columns

-- ── github_connections ──
CREATE TABLE github_connections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  access_token text NOT NULL,
  github_username text NOT NULL,
  github_avatar_url text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE github_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own github connection"
  ON github_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own github connection"
  ON github_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own github connection"
  ON github_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own github connection"
  ON github_connections FOR DELETE
  USING (auth.uid() = user_id);

-- ── project_github_links ──
CREATE TABLE project_github_links (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  repo_owner text NOT NULL,
  repo_name text NOT NULL,
  webhook_id bigint,
  sync_issues boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE project_github_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view github links"
  ON project_github_links FOR SELECT
  USING (can_access_project(project_id, auth.uid()));

CREATE POLICY "Project members can insert github links"
  ON project_github_links FOR INSERT
  WITH CHECK (can_access_project(project_id, auth.uid()));

CREATE POLICY "Project members can update github links"
  ON project_github_links FOR UPDATE
  USING (can_access_project(project_id, auth.uid()));

CREATE POLICY "Project members can delete github links"
  ON project_github_links FOR DELETE
  USING (can_access_project(project_id, auth.uid()));

-- ── tasks: add GitHub columns ──
ALTER TABLE tasks ADD COLUMN github_issue_number int;
ALTER TABLE tasks ADD COLUMN github_issue_url text;
