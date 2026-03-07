# Migration Log

Tracks all SQL migrations applied to the remote Supabase database. Since `supabase db push` has auth issues, migrations are applied manually via the SQL Editor.

## Applied Migrations

### 2026-02-22

| # | Migration File | What it does | Applied |
|---|---|---|---|
| 1 | `20260222_add_ai_settings.sql` | ai_provider + ai_api_key columns on profiles (BYOK) | ✅ Auto (agent) |
| 2 | `20260222_chat_persistence.sql` | chat_sessions + chat_messages tables for Chat-to-Board | ✅ Auto (agent) |
| 3 | `20260222_task_comments.sql` | task_comments table + RLS for PR links & notes | ✅ Manual SQL Editor |
| 4 | `20260222_soft_delete.sql` | deleted_at column on tasks + split SELECT RLS policies | ✅ Manual SQL Editor |
| 5 | `20260222_fix_soft_delete_rls.sql` | Fix UPDATE/DELETE RLS policies for soft-delete | ✅ Manual SQL Editor |
| 6 | `20260222_task_activity.sql` | task_activity table + auto-logging trigger on tasks | ✅ Manual SQL Editor |
| 7 | `20260222_github_integration.sql` | github_connections + project_github_links tables, github columns on tasks | ✅ Manual SQL Editor |

## Why Manual?

`supabase db push` fails with SASL auth error against the remote DB. The DB password in `.env.local` doesn't match what the CLI expects. Until this is fixed, all migrations are applied by copy-pasting into the Supabase SQL Editor (Dashboard → SQL Editor → New Query).

## How to Apply a New Migration

1. Write the migration file in `supabase/migrations/`
2. Use `IF NOT EXISTS` and `DROP POLICY IF EXISTS` for idempotency
3. Copy the SQL and run it in Supabase SQL Editor
4. Update this log
