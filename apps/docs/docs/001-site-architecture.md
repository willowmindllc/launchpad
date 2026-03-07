# 001 — LaunchPad Docs Site Architecture

## What

A public documentation site for LaunchPad, built with Next.js 16 and Fumadocs. Serves as the single source of truth for LaunchPad's architecture, features, API reference, and setup guides.

## Why

LaunchPad's internal docs (markdown files in the main repo) are great for developers working on the codebase, but they're not accessible to users, contributors, or anyone evaluating the tool. A public docs site:

- Makes the project approachable for new contributors
- Provides a polished reference for all features and APIs
- Can be deployed independently from the main app
- Supports search, navigation, and dark mode out of the box

## How

### Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 16 (App Router) | Latest Next.js with Turbopack, static export support |
| Docs Engine | Fumadocs (core + mdx + ui) v16 | Purpose-built for Next.js docs — sidebar, search, dark mode, TOC, MDX |
| Styling | Tailwind CSS v4 | Utility-first, matches the main LaunchPad app |
| Content | MDX files in `content/docs/` | Markdown with JSX support, frontmatter for metadata |
| Deployment | Vercel (static export) | Zero-config deploys, CDN, same platform as LaunchPad |

### Architecture

```
┌─────────────────────────────────────────────┐
│              Fumadocs UI Layer              │
│  DocsLayout (sidebar + nav + search)        │
│  DocsPage (TOC + body + footer)             │
│  RootProvider (theme + search provider)     │
├─────────────────────────────────────────────┤
│              Content Layer                  │
│  content/docs/*.mdx → fumadocs-mdx loader   │
│  source.config.ts → collection definitions  │
│  .source/ → auto-generated index files      │
├─────────────────────────────────────────────┤
│              Next.js App Router             │
│  src/app/(home)/ → landing page             │
│  src/app/docs/   → docs layout + pages      │
│  src/app/docs/[[...slug]]/ → catch-all MDX  │
├─────────────────────────────────────────────┤
│              Build & Deploy                 │
│  next build (static export)                 │
│  Vercel auto-deploy from main branch        │
└─────────────────────────────────────────────┘
```

### Content Structure

```
content/docs/
├── index.mdx                    # Introduction / landing
├── getting-started.mdx          # Setup guide
├── architecture.mdx             # Tech stack + request flows
├── authentication.mdx           # Auth providers + flow
├── api-reference.mdx            # Routes, queries, functions
├── meta.json                    # Sidebar ordering
└── features/
    ├── meta.json                # Features section config
    ├── kanban-board.mdx
    ├── ai-task-suggestions.mdx
    ├── chat-to-board.mdx
    ├── task-comments.mdx
    ├── soft-delete-trash.mdx
    ├── activity-log.mdx
    ├── github-integration.mdx
    └── dashboard.mdx
```

### Key Design Decisions

1. **Fumadocs over Nextra/Docusaurus:** Fumadocs is built specifically for Next.js App Router with first-class MDX, automatic sidebar generation, built-in search, and dark mode. It's lighter than Docusaurus and more feature-complete than rolling our own.

2. **Static Export:** The docs site has no dynamic data — it's pure content. Static export means instant page loads, no server costs, and CDN-level caching.

3. **MDX over plain Markdown:** MDX lets us embed React components (callouts, tabs, code blocks with syntax highlighting) if needed, while still being readable as plain markdown.

4. **Content separate from source:** Docs live in `content/docs/` not `src/` — this keeps content editable by non-developers and makes the boundary between app code and documentation clear.

5. **Catch-all route `[[...slug]]`:** A single dynamic route handles all doc pages. Fumadocs resolves the slug to the correct MDX file and renders it with the docs layout.

### File Structure

```
launchpad-docs/
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout + RootProvider
│   │   ├── global.css           # Tailwind + Fumadocs styles
│   │   ├── (home)/
│   │   │   ├── layout.tsx       # Home layout (nav only)
│   │   │   └── page.tsx         # Landing page (hero + features)
│   │   └── docs/
│   │       ├── layout.tsx       # DocsLayout (sidebar + nav)
│   │       └── [[...slug]]/
│   │           └── page.tsx     # MDX renderer
│   └── lib/
│       └── source.ts            # Fumadocs source loader
├── content/docs/                # All MDX documentation
├── public/                      # Static assets
├── docs/
│   └── 001-site-architecture.md # This file
├── source.config.ts             # Fumadocs MDX configuration
├── next.config.ts               # Next.js config with MDX plugin
├── postcss.config.mjs           # PostCSS + Tailwind
├── tsconfig.json                # TypeScript config
├── package.json
└── README.md
```
