# LaunchPad Docs

Public documentation site for [LaunchPad](https://github.com/willowmindllc/launchpad) — a lightweight project management tool for solo builders and micro-teams.

Built with [Next.js 16](https://nextjs.org), [Fumadocs](https://fumadocs.vercel.app), and [Tailwind CSS](https://tailwindcss.com).

## Features

- Full documentation for all LaunchPad features
- Sidebar navigation with collapsible sections
- Dark mode (system + manual toggle)
- Full-text search
- Table of contents per page
- Mobile responsive
- Static export for fast CDN delivery

## Setup

```bash
# Clone the repo
git clone https://github.com/willowmindllc/launchpad-docs.git
cd launchpad-docs

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with Turbopack |
| `npm run build` | Production build (static export) |
| `npm run start` | Serve the production build locally |
| `npm run postinstall` | Generate Fumadocs source index |

## Project Structure

```
├── src/app/           — Next.js app routes (home + docs)
├── content/docs/      — MDX documentation files
├── public/            — Static assets
├── docs/              — Internal architecture docs
├── source.config.ts   — Fumadocs content configuration
├── next.config.ts     — Next.js configuration
└── package.json
```

## Adding Documentation

1. Create a new `.mdx` file in `content/docs/` (or a subdirectory)
2. Add frontmatter with `title` and `description`
3. Add the page to `content/docs/meta.json` for sidebar ordering
4. The page is automatically available at `/docs/<filename>`

## Deploy to Vercel

1. Push this repo to GitHub
2. Import the repo in [Vercel](https://vercel.com/new)
3. No environment variables needed — it's a static site
4. Vercel auto-deploys on every push to `main`

Or deploy manually:

```bash
npm run build    # Outputs to /out
# Upload the /out directory to any static host
```

## Tech Stack

- **Next.js 16** — React framework with App Router
- **Fumadocs** — Documentation framework (sidebar, search, dark mode, MDX)
- **Tailwind CSS v4** — Utility-first styling
- **TypeScript** — Type safety
- **Vercel** — Hosting and CDN
