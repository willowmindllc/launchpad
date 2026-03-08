# LP-052: Playwright E2E Smoke Tests

## What
A Playwright test suite for LaunchPad covering unauthenticated smoke tests and authenticated board/task CRUD tests.

## Test Structure

```
tests/e2e/
├── auth.setup.ts    # Programmatic login → saves storageState
├── smoke.spec.ts    # 6 unauthenticated tests (no login needed)
└── board.spec.ts    # Authenticated board + task CRUD tests
```

### Playwright Config (playwright.config.ts)
Four test projects:
- **setup** — Logs in via UI, saves auth cookies to `.auth/user.json`
- **smoke** — Unauthenticated tests (no setup dependency)
- **chromium** — Authenticated tests (depends on setup)
- **mobile** — Mobile viewport smoke tests (Pixel 5)

## Smoke Tests (unauthenticated)
1. Homepage redirects to login
2. Login page renders sign-in form (email, password, submit)
3. Login page has OAuth buttons (Google, GitHub)
4. Signup page accessible
5. Protected routes redirect to login (/dashboard, /projects, /settings)
6. Login page has link to signup

## Authenticated Tests (board.spec.ts)
Requires `E2E_USER_EMAIL` and `E2E_USER_PASSWORD` env vars.

1. Dashboard loads after auth
2. Projects page lists projects
3. Board renders with kanban columns
4. Create task via dialog
5. Trash and restore task

## Running Tests

### Smoke tests only (no credentials needed)
```bash
BASE_URL="https://launchpad.willowmindllc.tech" npx playwright test --project=smoke
```

### All tests (needs test user)
```bash
E2E_USER_EMAIL=test@example.com \
E2E_USER_PASSWORD=secret \
BASE_URL="https://launchpad.willowmindllc.tech" \
npx playwright test
```

### Mobile smoke tests
```bash
BASE_URL="https://launchpad.willowmindllc.tech" npx playwright test --project=mobile
```

## CI Integration
Add to `.github/workflows/`:
```yaml
- name: E2E Smoke Tests
  run: |
    cd apps/web
    npx playwright install chromium
    BASE_URL="${{ secrets.PREVIEW_URL }}" npx playwright test --project=smoke
```

## Why
- Catch regressions before they hit production
- Verify auth redirects work correctly
- Validate task CRUD lifecycle
- Run headless — no browser relay needed
