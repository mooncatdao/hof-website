# Site Structure Overview

## Top-Level Files

- `README.md`: human-facing project notes and commands
- `PROJECT_CONTEXT.md`: compact project context for AI/code discussions
- `package.json`: Node scripts, dependencies, and engine requirement
- `package-lock.json`: locked npm dependency tree
- `wrangler.jsonc`: Cloudflare/Wrangler asset and compatibility config
- `cloudflare deployment notes.md`: Cloudflare setup details
- `site structure overview.md`: this file

## Public Site

- `public/index.html`: main Hall of Fame page and browser rendering logic
- `public/styles/site.css`: public page layout, themes, cards, controls tray, warp/starfield state
- `public/members.json`: generated member data from on-chain and ENS metadata
- `public/overrides.json`: curated Hall of Fame order and display overrides
- `public/libmooncat-limited.js`: client-side fallback MoonCat rendering helper
- `public/vendor/starfield.js`: warp/starfield visual effect
- `public/vendor/starfield.LICENSE.txt`: starfield dependency license

## Public Assets

- `public/assets/full-moon.png`: moon icon used to open the display controls tray
- `public/assets/mooncats/manifest.json`: cached MoonCat image metadata
- `public/assets/mooncats/regular/*.png`: cached transparent MoonCat PNGs

The `regular` folder name is historical compatibility. Images are currently fetched from the MoonCat Community `/image/<rescueIndex>` endpoint with fixed options.

## Admin UI

- `public/admin.html`: admin editor shell and browser UI
- `public/admin-core.js`: testable admin data normalization, validation, export, and cache helpers
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

## Scripts

- `scripts/dayoneclub.mjs`: rebuilds `public/members.json` from Ethereum mainnet MoonCat ownership, ENS metadata, and delegate.xyz delegation metadata
- `scripts/cache-mooncat-images.mjs`: caches MoonCat PNGs and writes `public/assets/mooncats/manifest.json`
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

## Data Flow

1. `npm run build` creates `public/members.json`.
2. The curated list in `public/overrides.json` chooses/order cards and overrides display text.
3. `npm run cache:images` fetches PNGs for the curated rescue indexes.
4. `public/index.html` loads generated data and overrides in the browser.
5. Public cards prefer cached PNGs and fall back to LibMoonCat-generated images if needed.
6. Admin edits can export JSON locally or save through Cloudflare Functions to GitHub.

