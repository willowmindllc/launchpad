# WM-008: RLS Security Audit

**Date:** 2026-03-07
**Auditor:** Mahadev Builder 🔱

## Summary

All 9 tables have RLS enabled. SECURITY DEFINER functions handle recursive policy checks correctly. A few issues found — see Findings below.

## Tables Audited

| Table | RLS Enabled | Policies | Status |
|-------|-------------|----------|--------|
| profiles | ✅ | SELECT (public), UPDATE (own), INSERT (own + service) | ⚠️ See F-1 |
| projects | ✅ | SELECT (member), INSERT (owner), UPDATE (owner), DELETE (owner) | ✅ |
| tasks | ✅ | SELECT (member, soft-delete aware), INSERT/UPDATE/DELETE (member + editor) | ✅ |
| project_members | ✅ | SELECT (all authed), INSERT/DELETE/UPDATE (admin/owner) | ⚠️ See F-2 |
| task_comments | ✅ | SELECT (member), INSERT (commenter), DELETE (own) | ✅ |
| task_activity | ✅ | SELECT (member), INSERT (any authed) | ⚠️ See F-3 |
| github_connections | ✅ | CRUD (own user_id) | ✅ |
| project_github_links | ✅ | CRUD (member via SECURITY DEFINER) | ✅ |
| project_invites | ✅ | CRUD (admin/owner) | ✅ |
| chat_sessions | ✅ | CRUD (own user_id) | ✅ |
| chat_messages | ✅ | CRUD (own session) | ✅ |

## SECURITY DEFINER Functions

| Function | Purpose | Risk |
|----------|---------|------|
| `is_project_member(uuid)` | Check membership without recursion | ✅ Low — read-only |
| `user_is_project_owner(uuid)` | Check ownership | ✅ Low — read-only |
| `is_task_member(uuid)` | Check task access via project | ✅ Low — read-only |
| `can_edit_project(uuid)` | Editor+ role check | ✅ Low — read-only |
| `can_comment_on_project(uuid)` | Member+ role check | ✅ Low — read-only |
| `purge_expired_archives()` | Delete old archived/trashed items | ✅ Low — scheduled only |
| `log_task_activity()` | Trigger for activity logging | ✅ Low — trigger-only |

All SECURITY DEFINER functions have `SET search_path = public` ✅ (prevents search_path injection).

## Findings

### F-1: Profiles SELECT is fully public (LOW RISK)
**Policy:** `"Public profiles are viewable by everyone" on profiles for select using (true)`
**Risk:** Any authenticated user can read any profile (email, name).
**Recommendation:** Consider restricting to project co-members only. However, this is common for collaboration apps — knowing who someone is enables sharing. **Accept as-is** unless PII concerns arise.

### F-2: project_members SELECT is fully open to authed users (LOW RISK)
**Policy:** `for select using (true)` — any authenticated user can list members of any project.
**Risk:** Users can enumerate who is in which project.
**Recommendation:** Restrict to `is_project_member(project_id)` for tighter security. Current policy was set to avoid RLS recursion. **Accept as-is** — the SECURITY DEFINER pattern already handles the recursion, but changing this requires careful testing.

### F-3: task_activity INSERT is fully open (MEDIUM RISK)
**Policy:** `"Users can insert activity" on task_activity for insert with check (true)`
**Risk:** Any authenticated user can insert fake activity records for any task, even tasks they don't have access to.
**Recommendation:** Restrict to `can_edit_project((select project_id from tasks where id = task_id))` or rely solely on the trigger (and remove the open INSERT policy since the trigger runs as SECURITY DEFINER anyway).
**Action:** Fix this.

### F-4: No UPDATE policy on task_comments (LOW RISK)
**Observation:** Users can create and delete their own comments but cannot edit them.
**Recommendation:** Add UPDATE policy if comment editing is desired. Not a security issue — just a feature gap.

### F-5: project_github_links uses SECURITY DEFINER for access checks (OK)
All policies reference `is_project_member()` — correct pattern.

## Action Items

| # | Finding | Severity | Action |
|---|---------|----------|--------|
| 1 | F-1: Public profiles | Low | Accept |
| 2 | F-2: Open member listing | Low | Accept (monitor) |
| 3 | F-3: Open task_activity INSERT | Medium | **Fix: restrict to project editors** |
| 4 | F-4: No comment UPDATE | Low | Feature gap, not security |

## Conclusion

RLS coverage is solid. The main issue is F-3 (unrestricted activity INSERT). All other findings are low risk and acceptable for the current stage. No critical vulnerabilities found.
