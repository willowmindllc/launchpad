# Contributing to LaunchPad

Thanks for your interest in contributing! LaunchPad is an open source project by [Willowmind LLC](https://willowmindllc.tech).

## Getting Started

### Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/) 10+
- A Supabase account (for backend)

### Setup

```bash
git clone https://github.com/willowmindllc/launchpad.git
cd launchpad
pnpm install
cp apps/web/.env.example apps/web/.env.local
# Fill in your Supabase credentials
pnpm dev
```

### Project Structure

```
launchpad/
├── apps/
│   ├── web/     ← Next.js application
│   └── docs/    ← Documentation site (Fumadocs)
├── turbo.json   ← Turborepo config
└── pnpm-workspace.yaml
```

## How to Contribute

### Reporting Bugs

1. Check [existing issues](https://github.com/willowmindllc/launchpad/issues) first
2. Open a new issue with:
   - Clear title describing the bug
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser/OS info if relevant

### Suggesting Features

Open an issue with the `enhancement` label. Include:
- The problem you're trying to solve
- Your proposed solution
- Any alternatives you considered

### Submitting Code

1. **Fork** the repository
2. **Create a branch** from `main`: `git checkout -b feat/your-feature`
3. **Make your changes** — follow the code style below
4. **Test locally**: `pnpm build` must pass
5. **Commit** with a clear message (see below)
6. **Open a Pull Request** against `main`

### Commit Messages

We use conventional commits:

```
feat: add task export to PDF
fix: resolve dark mode checkbox toggle
docs: update getting started guide
chore: update dependencies
```

### Code Style

- **TypeScript** everywhere — no `any` unless absolutely necessary
- **Tailwind CSS** for styling — no inline styles or CSS modules
- **shadcn/ui** for components — don't reinvent primitives
- **Server Components** by default — add `"use client"` only when needed
- **Named exports** preferred over default exports

### Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Include a description of what changed and why
- Link to the related issue if one exists
- Ensure `pnpm build` passes before requesting review
- Screenshots for UI changes are appreciated

## Code of Conduct

Be respectful. We're all here to build something useful. Harassment, discrimination, or toxic behavior won't be tolerated.

## Questions?

Open a [Discussion](https://github.com/willowmindllc/launchpad/discussions) or reach out at **sameerthecoder@willowmindllc.tech**.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
