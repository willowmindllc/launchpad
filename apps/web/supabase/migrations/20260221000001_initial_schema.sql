-- LaunchPad Initial Schema

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Custom types
create type task_status as enum ('backlog', 'in_progress', 'review', 'done');
create type task_priority as enum ('low', 'medium', 'high', 'urgent');
create type member_role as enum ('owner', 'admin', 'member', 'viewer');

-- Profiles (extends auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  full_name text,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Projects
create table projects (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  owner_id uuid references profiles(id) on delete cascade not null,
  archived boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Tasks
create table tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  status task_status default 'backlog' not null,
  priority task_priority default 'medium' not null,
  project_id uuid references projects(id) on delete cascade not null,
  assignee_id uuid references profiles(id) on delete set null,
  due_date date,
  position integer default 0 not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Project members
create table project_members (
  project_id uuid references projects(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role member_role default 'member' not null,
  created_at timestamptz default now() not null,
  primary key (project_id, user_id)
);

-- Indexes
create index idx_tasks_project on tasks(project_id);
create index idx_tasks_assignee on tasks(assignee_id);
create index idx_tasks_status on tasks(status);
create index idx_project_members_user on project_members(user_id);

-- RLS
alter table profiles enable row level security;
alter table projects enable row level security;
alter table tasks enable row level security;
alter table project_members enable row level security;

-- Profiles: users can read all, update own
create policy "Public profiles are viewable by everyone" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- Projects: members can view, owners can modify
create policy "Project members can view projects" on projects for select using (
  owner_id = auth.uid() or
  exists (select 1 from project_members where project_id = id and user_id = auth.uid())
);
create policy "Users can create projects" on projects for insert with check (owner_id = auth.uid());
create policy "Owners can update projects" on projects for update using (owner_id = auth.uid());
create policy "Owners can delete projects" on projects for delete using (owner_id = auth.uid());

-- Tasks: project members can CRUD
create policy "Project members can view tasks" on tasks for select using (
  exists (
    select 1 from projects p
    left join project_members pm on pm.project_id = p.id
    where p.id = tasks.project_id and (p.owner_id = auth.uid() or pm.user_id = auth.uid())
  )
);
create policy "Project members can create tasks" on tasks for insert with check (
  exists (
    select 1 from projects p
    left join project_members pm on pm.project_id = p.id
    where p.id = tasks.project_id and (p.owner_id = auth.uid() or pm.user_id = auth.uid())
  )
);
create policy "Project members can update tasks" on tasks for update using (
  exists (
    select 1 from projects p
    left join project_members pm on pm.project_id = p.id
    where p.id = tasks.project_id and (p.owner_id = auth.uid() or pm.user_id = auth.uid())
  )
);
create policy "Project members can delete tasks" on tasks for delete using (
  exists (
    select 1 from projects p
    left join project_members pm on pm.project_id = p.id
    where p.id = tasks.project_id and (p.owner_id = auth.uid() or pm.user_id = auth.uid())
  )
);

-- Project members: viewable by project members
create policy "Project members can view members" on project_members for select using (
  exists (
    select 1 from projects p where p.id = project_id and p.owner_id = auth.uid()
  ) or user_id = auth.uid()
);
create policy "Owners can manage members" on project_members for insert with check (
  exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid())
);
create policy "Owners can remove members" on project_members for delete using (
  exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid())
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Auto-add owner as project member
create or replace function handle_new_project()
returns trigger as $$
begin
  insert into project_members (project_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_project_created
  after insert on projects
  for each row execute procedure handle_new_project();
