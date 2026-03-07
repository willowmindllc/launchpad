-- Chat persistence: sessions + messages for Chat-to-Board

-- Chat sessions
create table chat_sessions (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text default 'New Chat' not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Chat messages
create table chat_messages (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references chat_sessions(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  tasks_json jsonb,
  actions_json jsonb,
  created_at timestamptz default now() not null
);

-- Indexes
create index idx_chat_sessions_project_user on chat_sessions(project_id, user_id);
create index idx_chat_messages_session_created on chat_messages(session_id, created_at);

-- RLS
alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;

-- Chat sessions: users can CRUD their own
create policy "Users can view own chat sessions" on chat_sessions
  for select using (user_id = auth.uid());

create policy "Users can create own chat sessions" on chat_sessions
  for insert with check (user_id = auth.uid());

create policy "Users can update own chat sessions" on chat_sessions
  for update using (user_id = auth.uid());

create policy "Users can delete own chat sessions" on chat_sessions
  for delete using (user_id = auth.uid());

-- Chat messages: users can CRUD through their sessions
create policy "Users can view own chat messages" on chat_messages
  for select using (
    exists (select 1 from chat_sessions cs where cs.id = session_id and cs.user_id = auth.uid())
  );

create policy "Users can create own chat messages" on chat_messages
  for insert with check (
    exists (select 1 from chat_sessions cs where cs.id = session_id and cs.user_id = auth.uid())
  );

create policy "Users can update own chat messages" on chat_messages
  for update using (
    exists (select 1 from chat_sessions cs where cs.id = session_id and cs.user_id = auth.uid())
  );

create policy "Users can delete own chat messages" on chat_messages
  for delete using (
    exists (select 1 from chat_sessions cs where cs.id = session_id and cs.user_id = auth.uid())
  );
