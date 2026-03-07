# LP-049: Add Editor Role — Separate from Admin

## Problem
The UI label "Editor" mapped to the `admin` database role, which grants invite and member management permissions. Users given "Editor" access could unexpectedly invite others to the project.

## Solution
Added a proper `editor` role to the `member_role` enum. Editors can edit tasks but cannot invite users or manage project members.

## Role Matrix
| Role | Edit Tasks | Comment | Invite | Manage Members |
|------|-----------|---------|--------|---------------|
| Owner | ✅ | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ | ✅ |
| Editor | ✅ | ✅ | ❌ | ❌ |
| Commenter | ❌ | ✅ | ❌ | ❌ |
| Viewer | ❌ | ❌ | ❌ | ❌ |

## Changes
- **Migration**: Added `editor` to `member_role` enum, updated `can_edit_project()` and `can_comment_on_project()` functions
- **Types**: `MemberRole` now includes `editor`
- **UI**: Share dialog shows Admin, Editor, Commenter, Viewer
- **Permissions**: `canEdit` checks in kanban board and task detail include editor

## Migration
- `20260307000004_add_editor_role.sql`
