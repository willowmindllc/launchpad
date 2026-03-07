# Authentication

LaunchPad uses [Supabase Auth](https://supabase.com/docs/guides/auth) for user authentication.

## Providers

### GitHub OAuth (LP-004)
- **Added:** Feb 21, 2026
- **Why:** Primary target audience is developers — GitHub is the natural first choice.
- **How it works:**
  1. User clicks "Sign in with GitHub" on the login page
  2. Redirected to GitHub → authorizes LaunchPad
  3. GitHub sends OAuth token back to Supabase callback URL
  4. Supabase creates/logs in the user, stores profile in `profiles` table
- **Setup:**
  1. Create a GitHub OAuth App at https://github.com/settings/developers
  2. Set callback URL: `https://<supabase-ref>.supabase.co/auth/v1/callback`
  3. Copy Client ID + Client Secret
  4. In Supabase Dashboard → Authentication → Providers → Enable GitHub, paste credentials
- **Files:** `src/app/login/page.tsx`, `src/app/auth/callback/route.ts`

### Google OAuth (LP-024)
- **Added:** Feb 22, 2026
- **Why:** GitHub-only limits audience to developers. Google covers 95%+ of users.
- **How it works:** Same flow as GitHub — OAuth redirect to Google, token back to Supabase.
- **Setup:**
  1. Go to https://console.cloud.google.com/apis/credentials
  2. Create OAuth 2.0 Client ID (Web application type)
  3. Add authorized redirect URI: `https://<supabase-ref>.supabase.co/auth/v1/callback`
  4. Copy Client ID + Client Secret
  5. In Supabase Dashboard → Authentication → Providers → Enable Google, paste credentials
- **Files:** `src/app/login/page.tsx`

### Email/Password (LP-024)
- **Added:** Feb 22, 2026
- **Why:** Fallback for users without GitHub/Google accounts.
- **How it works:** Supabase handles email/password natively. User signs up with email, gets confirmation email, then can log in.
- **Setup:** Enabled by default in Supabase. No external credentials needed.
- **Files:** `src/app/login/page.tsx`, `src/app/signup/page.tsx`

## Auth Flow

```
User clicks "Sign in with [Provider]"
  → Redirect to provider's OAuth page
  → User authorizes
  → Provider redirects to Supabase callback: /auth/v1/callback
  → Supabase creates session + user record
  → Supabase redirects to app: /auth/callback
  → App exchanges code for session
  → Redirect to /dashboard
```

## Middleware

- File: `src/middleware.ts` + `src/lib/supabase/middleware.ts`
- All routes except `/login`, `/signup`, `/auth/*` require authentication
- Unauthenticated users are redirected to `/login`
- Session is refreshed on every request via Supabase middleware

## Supabase Config

- **Project ref:** `your-project-ref`
- **Region:** us-east-1
- **Site URL:** `https://launchpad-your-github-username.vercel.app`
- **Redirect URLs:** Must include the production URL for OAuth to work

## Profile Creation

- On first login, a database trigger creates a row in the `profiles` table
- Profile includes: `id`, `username`, `full_name`, `avatar_url`, `ai_provider`, `ai_api_key`
- The `id` matches the Supabase auth user ID

## Security

- Row Level Security (RLS) on all tables
- Users can only access their own data
- API keys (`ai_api_key`) stored in profiles, accessible only by the owning user via `get_my_ai_settings()` security definer function
- Supabase handles password hashing, token rotation, and session management
