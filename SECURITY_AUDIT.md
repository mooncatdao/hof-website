# Security Audit

## Summary

This audit reviewed the public renderer, authenticated admin UI, Cloudflare Pages
Functions, GitHub repository write helper, deployment workflows, configuration,
tracked files, and npm dependencies.

No Critical or High findings were identified. The public site and admin preview
already render admin-editable text with DOM `textContent` and `createElement`
APIs, which prevents stored HTML or script injection through `name`, `handle`,
and `catName`.

This pass added low-risk defense-in-depth controls for cross-origin requests,
JSON request handling, UTF-8 body limits, session validation, GitHub path
configuration, error sanitization, rescue-index bounds, and browser response
headers.

## Threat Model

- Admin users are trusted MoonCat DAO members, but editable text is untrusted.
- A compromised GitHub account, accidental paste, malicious extension, or
  broader future admin access must not create stored XSS.
- Security must come from server-side authentication, authorization, and
  validation rather than from hiding the admin UI or its code.
- Direct commits to the configured GitHub branch remain acceptable for now.

## Critical

No Critical findings.

## High

No High findings.

## Medium

### M-1: State-changing admin requests relied only on cookie behavior

- **References:** `functions/api/admin/save-overrides.js:89`,
  `functions/api/auth/logout.js:7`, `functions/_lib/security.js:32`
- **Impact:** SameSite cookies provide a useful baseline, but explicit rejection
  of clearly cross-origin POSTs gives stronger protection against CSRF-like
  request paths and future browser behavior changes.
- **Recommendation:** Reject a request when its `Origin` header is present and
  does not match the request URL origin. Require JSON for admin saves.
- **Fixed in this pass:** Yes. Save and logout POST handlers now enforce
  same-origin requests, and saves require `application/json`.

### M-2: Admin saves commit directly to the configured branch

- **References:** `functions/api/admin/save-overrides.js:130`,
  `functions/_lib/github.js:134`
- **Impact:** A compromised authenticated admin account can publish curated text
  changes without a second reviewer. Stored XSS is mitigated by safe rendering,
  but unwanted content changes remain possible.
- **Recommendation:** Keep the current direct-save workflow while the admin
  group is small, use a fine-grained token with only required Contents access,
  and move to a PR/review workflow when operationally practical.
- **Fixed in this pass:** No. Accepted current behavior; see the future workflow
  recommendation below.

## Low

### L-1: Security headers were not consistently declared

- **References:** `functions/_lib/security.js:1`, `public/_headers:1`,
  `functions/admin.html.js:35`
- **Impact:** Missing defense-in-depth headers leaves more browser behavior at
  defaults, including framing and unused browser capabilities.
- **Recommendation:** Add low-risk headers without introducing a strict CSP
  that would break the current inline scripts.
- **Fixed in this pass:** Yes. Static responses declare headers through
  `public/_headers`; Function responses add them in code because Cloudflare
  does not apply `_headers` rules to Pages Functions responses.

### L-2: Save request size was measured as JavaScript characters

- **References:** `functions/api/admin/save-overrides.js:98`,
  `functions/api/admin/save-overrides.js:117`, `functions/_lib/security.js:42`
- **Impact:** Multi-byte UTF-8 input could exceed the intended byte limit while
  passing a character-count check.
- **Recommendation:** Reject oversized declared `Content-Length` values early
  and measure decoded request content as UTF-8 bytes.
- **Fixed in this pass:** Yes.

### L-3: GitHub API error messages could be returned to the browser

- **References:** `functions/_lib/github.js:86`, `functions/_lib/github.js:126`,
  `functions/_lib/github.js:155`, `functions/api/admin/save-overrides.js:143`
- **Impact:** Upstream messages are not intended as a browser-facing contract
  and could disclose operational details.
- **Recommendation:** Return stable generic errors to users and log failures
  server-side.
- **Fixed in this pass:** Yes.

### L-4: The optional GitHub overrides path lacked traversal checks

- **References:** `functions/_lib/github.js:4`, `functions/_lib/github.js:56`
- **Impact:** The path is controlled by Cloudflare configuration rather than a
  request, but an accidental unsafe configuration could target an unintended
  repository path.
- **Recommendation:** Require a non-empty repository-relative path without
  empty, `.` or `..` segments.
- **Fixed in this pass:** Yes.

### L-5: Removed organization members retain access until their session expires

- **References:** `functions/_lib/github.js:103`, `functions/_lib/auth.js:169`
- **Impact:** Organization membership is checked during OAuth login, not on
  every save. A removed member can continue using an existing signed session
  for its remaining lifetime.
- **Recommendation:** Keep the session TTL short. The default is 8 hours and the
  enforced maximum is 24 hours. Consider checking membership again during save
  if the admin group expands or revocation speed becomes important.
- **Fixed in this pass:** Partially. Sessions now become invalid if the
  configured organization changes. Per-save membership checks were not added.

### L-6: GitHub Actions use movable version tags

- **References:** `.github/workflows/cache-mooncat-images.yml:28`,
  `.github/workflows/deploy-pages.yml:30`,
  `.github/workflows/update-members.yml:17`
- **Impact:** A compromised upstream action tag could change workflow behavior.
- **Recommendation:** Pin actions to full commit SHAs and use Dependabot to keep
  action references current.
- **Fixed in this pass:** No. This should be a separate maintenance change with
  verified upstream SHAs.

## Informational

### I-1: Stored-XSS rendering review passed

- **References:** `public/index.html:432`, `public/index.html:464`,
  `public/admin.html:400`, `public/admin.html:432`,
  `functions/api/admin/save-overrides.js:46`
- **Result:** Editable text is rendered with `textContent`; the save endpoint
  strips unexpected member fields; no `innerHTML`, `outerHTML`,
  `insertAdjacentHTML`, `document.write`, `javascript:` URL, or
  `target="_blank"` usage was found in application code.

### I-2: OAuth and session baseline review passed

- **References:** `functions/api/auth/login.js:21`,
  `functions/api/auth/callback.js:47`, `functions/_lib/auth.js:137`,
  `functions/_lib/auth.js:185`, `functions/_lib/github.js:103`
- **Result:** OAuth uses random state, compares the state cookie on callback,
  requires active organization membership, signs session payloads with HMAC,
  expires sessions, and sets HttpOnly, Secure, SameSite=Lax cookies. The save
  endpoint independently validates the signed session.

### I-3: Rescue indexes are now bounded to the Day 1 range

- **References:** `functions/api/admin/save-overrides.js:19`,
  `public/scripts/admin-core.js:11`, `public/scripts/site.js:400`
- **Result:** Admin validation, server-side saves, and public override rendering
  reject rescue indexes outside `0..491`.

### I-4: No committed secrets were found

- **References:** `.gitignore:5`, `README.md:56`,
  `cloudflare deployment notes.md:68`
- **Result:** The tracked-file scan found documented variable names but no OAuth
  secrets, GitHub tokens, private keys, `.env` files, or `.dev.vars` files.

### I-5: Dependency advisory scan passed

- **References:** `package.json:14`, `package-lock.json`
- **Result:** `npm audit --json` reported zero known advisories across 105
  installed dependencies. Consider enabling Dependabot for npm dependencies and
  GitHub Actions.

### I-6: Public data and deployment surfaces need manual verification

- **References:** `public/members.json`, `.github/workflows/deploy-pages.yml:38`,
  `wrangler.jsonc:8`
- **Result:** `public/members.json` includes owner addresses and ENS-derived
  metadata. Confirm this is intentional before release. GitHub Pages deploys
  `public/` statically, so its `/admin.html` does not receive Cloudflare
  authentication or Function headers. It cannot perform server-side saves, but
  the Cloudflare custom domain should be the documented admin entrypoint.
- **Needs manual verification:** Confirm the production custom domain routes
  through Cloudflare Pages Functions and test response headers after deployment.

## Follow-Up Items

1. Verify the production OAuth callback is exactly
   `https://YOUR_DOMAIN/api/auth/callback` and limit accepted production
   hostnames operationally.
2. Confirm `GITHUB_CONTENT_TOKEN` is fine-grained and scoped to the intended
   repository with only required Contents read/write access.
3. Pin GitHub Actions to verified full commit SHAs and configure Dependabot.
4. Confirm publication of owner addresses and ENS-derived metadata is intended.
5. Stage a stricter CSP after moving inline scripts into external files. A
   starting policy is:

   ```text
   default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'self'; style-src 'self' https://fonts.cdnfonts.com; font-src https://fonts.cdnfonts.com; img-src 'self' data:; connect-src 'self'; form-action 'self'
   ```

## Future PR/Review Save Workflow

For stronger change control, replace direct writes to the production branch
with:

1. Create a short-lived branch for each admin save.
2. Commit only the normalized `public/overrides.json`.
3. Open a pull request with the authenticated GitHub login in the description.
4. Require a DAO reviewer and relevant status checks before merge.
5. Let the existing image-cache workflow run after the reviewed override change
   reaches `main`.

## References

- Cloudflare Pages custom headers:
  <https://developers.cloudflare.com/pages/configuration/headers/>
- GitHub Actions secure use reference:
  <https://docs.github.com/en/actions/reference/security/secure-use>
