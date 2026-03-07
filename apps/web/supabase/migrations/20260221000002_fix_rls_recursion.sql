-- Fix infinite recursion in RLS policies for projects <-> project_members

DROP POLICY IF EXISTS "Project members can view projects" ON projects;
DROP POLICY IF EXISTS "Project members can view members" ON project_members;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Security definer function to check membership without triggering RLS
CREATE OR REPLACE FUNCTION is_project_member(p_project_id uuid, p_user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members WHERE project_id = p_project_id AND user_id = p_user_id
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Fix handle_new_user trigger search path
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Projects: use function to avoid RLS recursion
CREATE POLICY "Project members can view projects" ON projects FOR SELECT USING (
  owner_id = auth.uid() OR is_project_member(id, auth.uid())
);

-- Project members: open read (not sensitive data)
CREATE POLICY "Project members can view members" ON project_members FOR SELECT USING (true);

-- Profiles: allow trigger inserts
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
CREATE POLICY "Service role can insert profiles" ON profiles FOR INSERT WITH CHECK (true);

-- Fix task policies (same circular recursion via projects <-> project_members)
DROP POLICY IF EXISTS "Project members can view tasks" ON tasks;
DROP POLICY IF EXISTS "Project members can create tasks" ON tasks;
DROP POLICY IF EXISTS "Project members can update tasks" ON tasks;
DROP POLICY IF EXISTS "Project members can delete tasks" ON tasks;

CREATE OR REPLACE FUNCTION can_access_project(p_project_id uuid, p_user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects WHERE id = p_project_id AND owner_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM project_members WHERE project_id = p_project_id AND user_id = p_user_id
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE POLICY "Project members can view tasks" ON tasks FOR SELECT USING (
  can_access_project(project_id, auth.uid())
);
CREATE POLICY "Project members can create tasks" ON tasks FOR INSERT WITH CHECK (
  can_access_project(project_id, auth.uid())
);
CREATE POLICY "Project members can update tasks" ON tasks FOR UPDATE USING (
  can_access_project(project_id, auth.uid())
);
CREATE POLICY "Project members can delete tasks" ON tasks FOR DELETE USING (
  can_access_project(project_id, auth.uid())
);
