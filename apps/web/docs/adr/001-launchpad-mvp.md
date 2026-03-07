# ADR-001: LaunchPad MVP

## Status
Accepted — 2026-02-21

## Context
We need a workflow tracking dashboard for solo builders and micro-teams (1-5 people). Jira is overkill for this audience. Linear is good but pricey. There's room for a lightweight, AI-native task/project tracker.

## Decision

### What
**LaunchPad** — Mission Control for solo builders and micro-teams. A workflow tracking dashboard that's fast, simple, and AI-native.

### Target Audience
- Indie hackers and solo developers
- Freelancers managing multiple clients
- Small agencies (2-5 people)
- B2C initially (free tier + $9/mo pro), B2B later

### Why Build This
1. Dogfooding — we use it ourselves to track our own builds
2. Proves our full-stack pipeline (Next.js → Supabase → Vercel → iOS)
3. Market gap: simple, fast, AI-aware project tracking for small teams
4. Revenue potential in the indie/freelancer niche

### Tech Stack
- **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Supabase (Postgres + Auth + Realtime + Row Level Security)
- **Hosting:** Vercel (auto-deploy from main branch)
- **Testing:** Vitest + React Testing Library (unit + integration from day one)
- **iOS:** SwiftUI native app (Phase 2, after web is stable)

### Why This Stack
- **Next.js + Vercel:** Zero-config CI/CD, push = deploy, edge performance
- **Supabase:** Postgres flexibility, built-in auth, realtime subscriptions, generous free tier
- **shadcn/ui:** Copy-paste components, fully customizable, no vendor lock-in
- **Vitest:** 10x faster than Jest, native ESM, works seamlessly with Next.js

### MVP Scope (Phase 1 — Web)
1. Auth (email + GitHub OAuth via Supabase)
2. Projects — create, archive, delete
3. Tasks — create, assign status (Backlog → In Progress → Review → Done), priority, due dates
4. Board view (Kanban) + List view
5. Dashboard — summary stats, recent activity
6. Real-time updates (Supabase subscriptions)

### Out of Scope (Phase 1)
- iOS app (Phase 2)
- AI features (Phase 3)
- Team/collaboration features (Phase 3)
- Billing/payments (when we have users)

### Testing Strategy
- Unit tests for business logic (task state transitions, validation)
- Integration tests for API routes (CRUD operations)
- No E2E until UI stabilizes

## Risks
- Crowded market — mitigated by niche focus (solo/micro-team) and AI-native roadmap
- Scope creep — mitigated by strict MVP boundaries
- Supabase dependency — mitigated by standard Postgres (can migrate)

## Consequences
- Web dashboard ships first, iOS follows
- All decisions logged as ADRs in this directory
- Project tracked in TOOLS.md
