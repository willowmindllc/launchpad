import Link from "next/link";

const features = [
  {
    title: "Kanban Board",
    description:
      "Drag-and-drop task management with Backlog, In Progress, Review, and Done columns.",
    icon: "📋",
  },
  {
    title: "AI Task Suggestions",
    description:
      "Generate actionable tasks from your project description using AI. Supports multiple providers.",
    icon: "🤖",
  },
  {
    title: "Chat-to-Board",
    description:
      "Describe your project in natural language and let AI break it into tasks on your board.",
    icon: "💬",
  },
  {
    title: "GitHub Integration",
    description:
      "Two-way sync between GitHub issues/PRs and your Kanban board. One repo, one board.",
    icon: "🔗",
  },
  {
    title: "Activity Log",
    description:
      "Every change to a task is tracked. See who changed what, when, with full edit history.",
    icon: "📝",
  },
  {
    title: "Dashboard Stats",
    description:
      "Completion rates, overdue tasks, stale backlog items, and per-project progress at a glance.",
    icon: "📊",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-6 py-24 text-center md:py-32">
        <div className="mb-4 inline-flex items-center rounded-full border border-fd-border bg-fd-secondary/50 px-4 py-1.5 text-sm text-fd-muted-foreground">
          Open Source Project Management
        </div>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-fd-foreground md:text-6xl">
          Ship faster with{" "}
          <span className="bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
            LaunchPad
          </span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-fd-muted-foreground md:text-xl">
          Lightweight workflow tracking for solo builders and micro-teams.
          Kanban boards, AI-powered task generation, GitHub sync — all in one
          place.
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/docs"
            className="inline-flex items-center justify-center rounded-lg bg-fd-primary px-6 py-3 text-sm font-medium text-fd-primary-foreground shadow-sm transition-colors hover:bg-fd-primary/90"
          >
            Read the Docs
          </Link>
          <Link
            href="/docs/getting-started"
            className="inline-flex items-center justify-center rounded-lg border border-fd-border bg-fd-background px-6 py-3 text-sm font-medium text-fd-foreground shadow-sm transition-colors hover:bg-fd-accent"
          >
            Get Started
          </Link>
        </div>
      </section>

      {/* Tech Stack Bar */}
      <section className="border-y border-fd-border bg-fd-card/50 px-6 py-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-4">
          <span className="text-xs font-medium uppercase tracking-widest text-fd-muted-foreground">Built with</span>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {["Next.js", "TypeScript", "Supabase", "Tailwind CSS", "Vercel"].map((tech) => (
              <span key={tech} className="rounded-full border border-fd-border bg-fd-background px-3 py-1 text-xs text-fd-foreground">{tech}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-6 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-4 text-center text-3xl font-bold text-fd-foreground">
            Everything you need to ship
          </h2>
          <p className="mb-12 text-center text-fd-muted-foreground">
            From drag-and-drop boards to AI-powered workflows — LaunchPad has
            you covered.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-fd-border bg-fd-card p-6 transition-shadow hover:shadow-md"
              >
                <div className="mb-3 text-3xl">{feature.icon}</div>
                <h3 className="mb-2 text-lg font-semibold text-fd-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-fd-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-fd-border px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-2xl font-bold text-fd-foreground md:text-3xl">
            Ready to launch?
          </h2>
          <p className="mb-8 text-fd-muted-foreground">
            Explore the docs to learn how LaunchPad works under the hood, set up
            your own instance, or contribute to the project.
          </p>
          <Link
            href="/docs"
            className="inline-flex items-center justify-center rounded-lg bg-fd-primary px-8 py-3 text-sm font-medium text-fd-primary-foreground shadow-sm transition-colors hover:bg-fd-primary/90"
          >
            Explore Documentation
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-fd-border px-6 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-sm text-fd-muted-foreground md:flex-row">
          <span>LaunchPad Docs</span>
          <div className="flex gap-6">
            <Link href="/docs" className="hover:text-fd-foreground">
              Documentation
            </Link>
            <a
              href="https://github.com/willowmindllc/launchpad"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-fd-foreground"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
