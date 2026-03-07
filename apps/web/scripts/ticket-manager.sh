#!/bin/bash
# Ticket Manager — Links PRs to LaunchPad tickets via Supabase comments
# Usage: ./scripts/ticket-manager.sh <PR_URL> <TICKET_ID> [NOTE]
# Example: ./scripts/ticket-manager.sh https://github.com/willowmindllc/launchpad/pull/1 "7fb91f2d-..." "Initial implementation"

set -euo pipefail

PR_URL="${1:?Usage: ticket-manager.sh <PR_URL> <TASK_ID> [NOTE]}"
TASK_ID="${2:?Usage: ticket-manager.sh <PR_URL> <TASK_ID> [NOTE]}"
NOTE="${3:-}"

# Load env
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../.env.local"

SRK="$SUPABASE_SERVICE_ROLE_KEY"
BASE_URL="$NEXT_PUBLIC_SUPABASE_URL"
USER_ID="${LAUNCHPAD_USER_ID:?Set LAUNCHPAD_USER_ID env var}"

COMMENT="🔗 PR: ${PR_URL}"
[[ -n "$NOTE" ]] && COMMENT="$COMMENT\n\n${NOTE}"

# Post comment on ticket
curl -s "${BASE_URL}/rest/v1/task_comments" \
  -H "apikey: $SRK" \
  -H "Authorization: Bearer $SRK" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"task_id\": \"${TASK_ID}\",
    \"user_id\": \"${USER_ID}\",
    \"content\": \"${COMMENT}\"
  }" | python3 -m json.tool

# Move ticket to in_progress
curl -s "${BASE_URL}/rest/v1/tasks?id=eq.${TASK_ID}" \
  -X PATCH \
  -H "apikey: $SRK" \
  -H "Authorization: Bearer $SRK" \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress"}'

echo "✅ Linked PR to ticket and moved to In Progress"
