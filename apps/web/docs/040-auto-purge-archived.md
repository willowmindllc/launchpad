# 040 — Auto-Delete Archived Projects After 7 Days (LP-040)

## Overview
Archived projects auto-purge after 7 days. Countdown shown on archived cards. Soft-deleted tasks also purge after 7 days.

## What Changed

### Migration: `20260305000001_archived_at_auto_purge.sql`
- Added `archived_at` timestamptz column to projects
- Trigger `trg_set_archived_at`: auto-sets `archived_at` on archive, clears on restore
- `purge_expired_archives()` function: deletes projects archived >7 days + tasks soft-deleted >7 days
- pg_cron schedule: runs daily at 3am UTC (requires pg_cron extension enabled)

### Updated: `project-list.tsx`
- Archived cards show "🗑️ Auto-deletes in X days" countdown
- Shows "⚠️ Deleting soon" when <1 day left

### Updated: `database.ts`
- Added `archived_at: string | null` to Project interface

## Setup Required
1. Run migration SQL in Supabase SQL Editor
2. Enable pg_cron extension: Dashboard → Database → Extensions → pg_cron
3. If pg_cron already enabled, re-run the `do $$ ... $$` block to schedule the job
