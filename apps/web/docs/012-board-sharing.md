# TF-002: Board Sharing

Google Drive-style sharing for project boards with invite-by-email, role-based access, and a share dialog.

## Roles

| Role | Label | Can Edit Tasks | Can Comment | Can View |
|------|-------|---------------|-------------|----------|
| owner | Owner | Yes | Yes | Yes |
| admin | Editor | Yes | Yes | Yes |
| member | Commenter | No | Yes | Yes |
| viewer | Viewer | No | No | Yes |

## Schema

### `project_invites` table

Stores pending invitations. Unique on `(project_id, invited_email)`.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| project_id | uuid | FK to projects |
| invited_email | text | Normalized email |
| role | member_role | Role to assign on accept |
| invited_by | uuid | FK to auth.users |
| status | invite_status | pending / accepted / declined |
| created_at | timestamptz | |
| accepted_at | timestamptz | Set on acceptance |

### Helper functions

- `can_edit_project(project_id, user_id)` — checks role is owner or admin
- `can_comment_on_project(project_id, user_id)` — checks role is owner, admin, or member
- `accept_pending_invites(user_id, email)` — loops pending invites and inserts into project_members

## Flow

1. Owner/admin opens Share dialog from project header
2. Enters email + selects role (Viewer/Commenter/Editor) and clicks Invite
3. Invite stored in `project_invites` table
4. When invitee logs in, `accept_pending_invites` runs in auth callback
5. Invitee's project_members row is created, invite marked accepted
6. Shared projects appear in "Shared with me" section on projects page

## API

### `POST /api/projects/[id]/invite`
Creates an invite. Returns 409 if duplicate.

### `DELETE /api/projects/[id]/invite`
Cancels an invite by `inviteId`.

## UI Enforcement

- **Viewers**: Read-only board, no DnD, no create/edit/delete, no comments
- **Commenters**: Read-only board but can add comments
- **Editors**: Full edit access, can manage sharing
- **Owners**: Full access including sharing management

## Email Invite Flow

When an owner/admin invites a collaborator, an email notification is sent via [Resend](https://resend.com).

### How it works

1. Owner/admin enters email + role in Share dialog and clicks Invite
2. API creates the `project_invites` row, then fires `sendInviteEmail` (non-blocking)
3. Invitee receives a styled HTML email with project name, inviter name, and an **Accept Invitation** CTA button
4. CTA links to `/invite/accept?token=<invite-id>`
5. **If logged in**: invite is accepted immediately, user is redirected to the project board
6. **If not logged in**: user is redirected to `/login?next=/invite/accept?token=<invite-id>`
7. After login (password or OAuth), the auth callback runs `acceptPendingInvites` and redirects to the accept page, which sees the accepted invite and redirects to the project

### Error states (accept page)

| Condition | Behavior |
|-----------|----------|
| Missing token | "Missing invite token" error |
| Invalid/expired token | "Invalid or expired" error |
| Already accepted | Redirect to project |
| Accept fails | Generic error with retry prompt |

> **TODO — Before launch:** Change the from address from `onboarding@resend.dev` to `noreply@willowmindllc.tech` (requires adding the domain in the Resend dashboard).

## Files

- `supabase/migrations/20260228000001_board_sharing.sql`
- `src/types/database.ts` — ProjectInvite, role labels
- `src/lib/supabase/queries.ts` — member/invite queries
- `src/lib/resend.ts` — configured Resend client
- `src/lib/email.ts` — `sendInviteEmail` helper
- `src/app/auth/callback/route.ts` — accept invites on login
- `src/app/invite/accept/page.tsx` — invite accept page (token lookup, accept, redirect)
- `src/app/(auth)/login/page.tsx` — updated to support `?next=` redirect param
- `src/components/project/share-dialog.tsx` — share dialog UI
- `src/app/api/projects/[id]/invite/route.ts` — invite API (now sends email)
- Board components updated with role-based permissions
