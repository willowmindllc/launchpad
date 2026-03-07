# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest  | ✅        |

We only support the latest version on the `main` branch. Please ensure you're up to date before reporting.

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, please email us at:

📧 **sameerthecoder@willowmindllc.tech**

Include:
- A description of the vulnerability
- Steps to reproduce (or a proof of concept)
- The potential impact
- Any suggested fixes (optional but appreciated)

## Response Timeline

- **Acknowledgment:** Within 48 hours
- **Initial assessment:** Within 5 business days
- **Fix or mitigation:** Varies by severity, but we aim for:
  - **Critical:** 24–72 hours
  - **High:** 1–2 weeks
  - **Medium/Low:** Next release cycle

## Scope

The following are in scope:
- The LaunchPad web application (`apps/web`)
- API routes and server-side logic
- Authentication and authorization flows
- Row Level Security (RLS) policies
- Supabase configuration as used by LaunchPad

The following are **out of scope**:
- Third-party services (Supabase infrastructure, Vercel platform, GitHub)
- The documentation site (`apps/docs`) — unless it exposes sensitive data
- Social engineering or phishing attacks
- Denial of service attacks

## Disclosure Policy

We follow coordinated disclosure. Once a fix is deployed, we'll:
1. Credit the reporter (unless they prefer anonymity)
2. Publish a brief advisory if the issue affected production users

Thank you for helping keep LaunchPad secure.
