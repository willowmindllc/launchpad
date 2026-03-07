# LP-048: Show Email Alongside Name in Share/Members UI

## Problem
The Share dialog's member list only displayed `full_name` from profiles. When multiple users share the same display name (e.g., three accounts all named "Sam"), there was no way to tell them apart.

## Solution

### Database
- Added `email` column to `profiles` table
- Backfilled existing profiles from `auth.users`
- Updated `handle_new_user()` trigger to store email on signup

### Query
- `getProjectMembers` now selects `email` in the profile join

### UI
- Each member row shows email below the name in muted, smaller text
- Pending invites already displayed email (no change needed)

## Migration
- `20260307000002_add_email_to_profiles.sql`
- Idempotent: uses `IF NOT EXISTS` for the column add
