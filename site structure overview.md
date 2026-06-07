# Site Structure Overview

## Top-Level Files

- `README.md`: human-facing project notes and commands
- `CONTRIBUTING.md`: contribution, security, and private-data handling guidance
- `SECURITY.md`: public security reporting and secret-handling guidance
- `LICENSE`: AGPL-3.0-or-later license text
- `NOTICE.md`: third-party and generated-code notices
- `package.json`: Node scripts, dependencies, and engine requirement
- `package-lock.json`: locked npm dependency tree
- `wrangler.jsonc`: Cloudflare/Wrangler asset and compatibility config
- `site structure overview.md`: this file

## Public Site

- `public/index.html`: main Hall of Fame page shell
- `public/_headers`: static security headers for Cloudflare Pages-style hosting
- `public/scripts/site.js`: public page browser rendering logic
- `public/scripts/display-options.js`: shared display helpers for image variants, cache paths, and compact holder links
- `public/styles/site.css`: public page layout, themes, cards, controls tray, warp/starfield state
- `public/members.json`: generated member data from on-chain and ENS metadata
- `public/overrides.json`: curated Hall of Fame order and display overrides
- `public/scripts/libmooncat-limited.js`: client-side fallback MoonCat rendering helper
- `public/vendor/starfield.js`: warp/starfield visual effect
- `public/vendor/starfield.LICENSE.txt`: starfield dependency license

## Public Assets

- `public/assets/favicon.png`: site favicon
- `public/assets/full-moon.png`: moon icon used to open the display controls tray
- `public/assets/mooncats/manifest.json`: cached MoonCat image metadata
- `public/assets/mooncats/regular/*.png`: cached transparent MoonCat PNGs
- `public/assets/mooncats/glow/*.png`: cached glow MoonCat PNGs
- `public/assets/mooncats/accessorized/*.png`: cached accessorized MoonCat PNGs
- `public/assets/mooncats/accessorized-glow/*.png`: cached accessorized glow MoonCat PNGs

Images are currently fetched from the MoonCat Community `/image/<rescueIndex>` endpoint. The `regular` variant uses fixed transparent options; the other variants add glow and/or API-selected accessories.

## Admin UI

- `public/admin.html`: admin editor shell
- `public/scripts/admin.js`: admin browser UI
- `public/scripts/admin-core.js`: testable admin data normalization, validation, export, and cache helpers
- `public/styles/admin.css`: admin layout and styling

The admin page loads generated members, overrides, and the image manifest. It supports validating curated entries, previewing the public card data, exporting JSON, and saving through Cloudflare Functions when authenticated.

## Cloudflare Functions

- `functions/admin.html.js`: protects the admin page behind GitHub OAuth
- `functions/api/auth/login.js`: creates OAuth state and redirects to GitHub
- `functions/api/auth/callback.js`: completes OAuth and checks organization membership
- `functions/api/auth/status.js`: reports current session state to the admin page
- `functions/api/auth/logout.js`: clears the session
- `functions/api/admin/save-overrides.js`: validates and commits overrides to GitHub
- `functions/_lib/auth.js`: shared signed-cookie/session helpers
- `functions/_lib/github.js`: shared GitHub OAuth and repository contents helpers
- `functions/_lib/security.js`: shared response security headers and request validation helpers

## Scripts

- `scripts/dayoneclub.mjs`: rebuilds `public/members.json` from Ethereum mainnet MoonCat ownership, ENS metadata, and delegate.xyz delegation metadata
- `scripts/cache-mooncat-images.mjs`: caches MoonCat PNG variants and writes `public/assets/mooncats/manifest.json`
- `scripts/sync-mooncat-names.mjs`: syncs curated `catName` values in `public/overrides.json` from the MoonCat API
- `scripts/capture-mobile-screenshots.mjs`: captures mobile public-site screenshots into `test-artifacts/mobile`
- `scripts/lib/libmooncat.js`: MoonCat ID/image helper used by the build script

## Tests

- `test/admin-core.test.js`: Node test coverage for admin helper behavior

Run tests with:

```bash
npm test
```

## GitHub Workflows

- `.github/workflows/deploy-pages.yml`: deploys `public/` to GitHub Pages on relevant pushes to `main`
- `.github/workflows/update-members.yml`: rebuilds `public/members.json` every 12 hours or manually
- `.github/workflows/cache-mooncat-images.yml`: refreshes and commits cached MoonCat image assets when relevant inputs change
- `.github/workflows/sync-mooncat-names.yml`: checks or syncs curated MoonCat names from the MoonCat API
- `.github/workflows/sync-public-hof-to-dao-site.yml`: mirrors the public viewer into the DAO website repository at `hof/`

## Data Flow

1. `npm run build` creates `public/members.json`.
2. The curated list in `public/overrides.json` chooses/order cards and overrides display text.
3. `npm run sync:cat-names` can update curated MoonCat names from the MoonCat API.
4. `npm run cache:images` fetches PNGs for the curated rescue indexes. By default it caches `regular`; `--variant=<name>` or `--all` can cache the other variants.
5. `public/index.html` loads generated data and overrides in the browser.
6. `public/scripts/display-options.js` chooses image variants and cache fallback paths for the current display controls.
7. Public cards prefer cached PNGs and fall back to LibMoonCat-generated images if needed.
8. Admin edits can export JSON locally or save through Cloudflare Functions to GitHub.
