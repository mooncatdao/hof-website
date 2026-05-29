# Cloudflare Deployment Notes

## Current Config

Cloudflare/Wrangler configuration lives in `wrangler.jsonc`.

```jsonc
{
  "name": "hof-website",
  "compatibility_date": "2026-05-27",
  "observability": {
    "enabled": true
  },
  "assets": {
    "directory": "public"
  },
  "compatibility_flags": [
    "nodejs_compat"
  ]
}
```

The static site assets are served from `public/`. Cloudflare Pages Functions-compatible route files live under `functions/`.

## Useful Commands

Install dependencies:

```bash
npm ci
```

Run a local Wrangler preview:

```bash
npm run preview
```

Deploy with Wrangler:

```bash
npm run deploy
```

The `package.json` scripts map those to `wrangler dev` and `wrangler deploy`.

## Static vs Function Behavior

The public Hall of Fame page is static and works from `public/index.html`.

The admin page has two modes:

- Static/local mode: `public/admin.html` loads in the browser and can export replacement `overrides.json`.
- Cloudflare Functions mode: `/admin.html` is intercepted by `functions/admin.html.js`, requires GitHub login, and then serves the admin page only after a valid session is present.

Local static servers such as `python3 -m http.server --directory public` do not run Cloudflare Functions, so GitHub login and server-side Save are unavailable in that mode.

## GitHub OAuth Admin Login

Create a GitHub OAuth app with callback URL:

```text
https://YOUR_DOMAIN/api/auth/callback
```

The OAuth flow requests `read:org` so private GitHub organization membership can be checked.

Required Cloudflare environment variables/secrets:

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_ORG`
- `SESSION_SECRET`

`SESSION_SECRET` must be at least 32 characters.

Optional auth setting:

- `ADMIN_SESSION_TTL_SECONDS`, defaults to 8 hours and must be at most 24 hours

## Admin Save To GitHub

The Save button posts to `functions/api/admin/save-overrides.js`. That endpoint validates the authenticated session, normalizes the overrides payload, and commits it back to GitHub using the repository contents API.

Required Cloudflare variables/secrets for saving:

- `GITHUB_REPO`, in `owner/name` format
- `GITHUB_CONTENT_TOKEN`, with Contents read/write access

Optional save settings:

- `GITHUB_BRANCH`, defaults to `main`
- `GITHUB_OVERRIDES_PATH`, defaults to `public/overrides.json`

The server-side commit message is:

```text
Update Hall of Fame overrides from <github-login>
```

## Function Routes

- `functions/admin.html.js`: protects `/admin.html`
- `functions/api/auth/login.js`: starts GitHub OAuth
- `functions/api/auth/callback.js`: exchanges OAuth code, checks org membership, creates session cookie
- `functions/api/auth/status.js`: returns current admin login status
- `functions/api/auth/logout.js`: clears session cookie
- `functions/api/admin/save-overrides.js`: commits cleaned override JSON to GitHub
- `functions/_lib/auth.js`: signed cookie/session helpers
- `functions/_lib/github.js`: GitHub API helpers

## Important Cookies

- `hof_admin_session`: signed admin session cookie
- `hof_oauth_state`: short-lived OAuth state cookie scoped to `/api/auth`

Cookies are set with `Secure` and `SameSite=Lax`.

## GitHub Pages Note

This repo also contains `.github/workflows/deploy-pages.yml`, which deploys `public/` to GitHub Pages. GitHub Pages serves the static public/admin files but does not run the Cloudflare Functions authentication/save flow.

