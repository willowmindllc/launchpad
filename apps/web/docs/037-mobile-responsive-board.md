# 037 — Mobile Responsive Board (LP-037)

## Overview
Board now shows a single column at a time on mobile (<768px) with tab navigation to switch between columns.

## What Changed

### New: `mobile-column-tabs.tsx`
- Tab bar with Backlog / In Progress / Review / Done
- Shows task count badges per column
- Active tab highlighted with primary color border
- Hidden on desktop (`md:hidden`)

### Updated: `kanban-board-live.tsx`
- Mobile: only active column visible (`hidden md:flex` + conditional show)
- Active column takes full width on mobile (`min-w-full`)
- Desktop column headers hidden on mobile (tabs replace them)
- Mobile-specific create button row
- Board height adjusted for mobile tab bar (`h-[calc(100vh-280px)]`)
- Mobile column state tracked via `mobileColumn` useState

## Behavior
- **Mobile**: Tab bar at top → tap to switch columns → single column scrolls vertically
- **Desktop**: Unchanged — all 4 columns side-by-side with horizontal scroll
- DnD still works on desktop, touch sensors still work on mobile within the visible column
