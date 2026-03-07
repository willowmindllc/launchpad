# 036 — Dashboard Empty State & Onboarding (LP-036)

## Overview
New users see a welcoming empty state with feature highlights and CTA instead of a grid of zeros.

## What Changed
- Empty state when `totalProjects === 0 && totalTasks === 0`
- Welcome message + "Create Your First Project" CTA
- 3 feature cards: Kanban Board, AI-Powered, Team Collaboration
- Replaced "Completed" stat with "Done This Week" (🔥) for more actionable metric
- `getDashboardStats` now returns `doneThisWeek` count from activity log
