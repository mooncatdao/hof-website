# Project Context

## What This Site Is

This repository builds and serves the Day 1 MoonCat Club Hall of Fame website. The public page presents a curated set of early MoonCats with owner display names, handles, cat names, cached MoonCat PNGs, selectable visual themes, and a warp/starfield mode.

The site is mostly static: `public/index.html` renders the public Hall of Fame in the browser from JSON data, CSS, and cached image assets. Cloudflare Pages Functions are also present for the authenticated admin save flow.

## Current Product Surface

- Public Hall of Fame page: `public/index.html`
- Admin editor page: `public/admin.html`
- Public styling: `public/styles/site.css`
- Admin styling: `public/styles/admin.css`
- Shared admin logic: `public/admin-core.js`
- Generated member data: `public/members.json`
- Curated display/order overrides: `public/overrides.json`
- Cached MoonCat images: `public/assets/mooncats/<variant>/<rescueIndex>.png`
- Cached image metadata: `public/assets/mooncats/manifest.json`

## Public Page Behavior

The public page loads `public/members.json` and optional `public/overrides.json`. If overrides exist, the curated override order determines which cards render and in what order. If overrides are missing or empty, the page falls back to all generated members sorted by rescue index.

Each card shows:

- Display name
- Handle
- Cached MoonCat image, with a browser-side LibMoonCat fallback if the cached PNG is missing
- MoonCat rescue index
- Optional cat name
- Optional favorite MoonCat if it differs from the rendered rescue index

The theme selector persists to `localStorage` using `hof-theme`. The warp toggle persists to `localStorage` using `hof-warp`, with a fallback read from the old `hof-flying` key. Glow and accessory image toggles persist using `hof-glow` and `hof-accessories`.

## Themes

Supported public themes are:

- `og`
- `light`
- `dark`
- `obsidian`
- `deepspace`
- `onlycats`
- `ac`
- `ac-t`

`onlycats` hides text visually. `ac` and `ac-t` are Adoption Center-inspired variants that add CSS-only blue oval platforms under each MoonCat. `ac` hides text while preserving the same vertical spacing as `ac-t`; `ac-t` keeps text visible.

## Card Metadata Positioning

The public renderer and admin preview attach each MoonCat's basic pose as `data-pose` on its card. Top metadata uses `--card-top-text-offset-y`, defaulting to `0px`. Sleeping and standing poses opt into the global `--card-top-text-safe-offset-y` downward offset, currently `12px`, and reserve handle-line whitespace when the handle is blank. Pouncing, stalking and unsupported poses keep the default position.

## Controls

Theme and warp controls are hidden behind the moon icon at `public/assets/full-moon.png`. The icon opens a small controls tray and closes again when clicked or when the user clicks outside the tray.

Warp mode uses `public/vendor/starfield.js` and toggles `body[data-warp='on']`.

## MoonCat Image Cache

MoonCat images are cached from the customizable MoonCat Community API image endpoint. The default regular image request is:

```text
https://api.mooncat.community/image/<rescueIndex>?scale=2&padding=0&backgroundColor=transparent&acc=&glow=false
```

The cache script keeps regular files under `public/assets/mooncats/regular/` for compatibility, even though the upstream endpoint is no longer `/regular-image`. It also supports these optional display variants:

- `regular`: no accessories, no glow
- `glow`: no accessories, glow
- `accessorized`: currently worn accessories, no glow
- `accessorized-glow`: currently worn accessories, glow

Accessorized requests intentionally omit the API's `acc` query parameter. Regular requests pass `acc=` to suppress accessories.

Important cache behavior:

- Script: `scripts/cache-mooncat-images.mjs`
- Default command: `npm run cache:images`
- Single variant command: `npm run cache:images -- --variant=<variant>`
- All variants command: `npm run cache:images -- --all`
- Force refresh flag: `--force`
- Source of rescue indexes: `public/overrides.json`
- Manifest path: `public/assets/mooncats/manifest.json`
- Manifest stores variant, URL, image options, dimensions, etag, size, and status
- Cache skipping compares the manifest URL/options against the desired endpoint/options

## Data Build

`scripts/dayoneclub.mjs` rebuilds `public/members.json` from Ethereum mainnet data. It checks MoonCat ownership and enriches owner metadata using ENS text records. If owner metadata is sparse, it checks delegate.xyz outgoing delegations for richer metadata.

Command:

```bash
npm run build
```

## Admin

`public/admin.html` is a browser editor for `public/overrides.json`. It can preview, validate, import, export, and save override data.

When served statically, the admin page can export JSON locally. When deployed with Cloudflare Pages Functions and the required GitHub environment variables, `/admin.html` is protected by GitHub OAuth organization membership, and the Save button commits `public/overrides.json` back to the repository through the GitHub contents API.

## Tests

The test suite is Node's built-in test runner and currently focuses on admin core helpers.

```bash
npm test
```

## Deployment Notes

The repo has two deployment-related setups:

- GitHub Pages workflow: `.github/workflows/deploy-pages.yml` deploys `public/` on pushes to `main` that touch `public/**`.
- Cloudflare/Wrangler config: `wrangler.jsonc` serves `public/` assets and enables Pages Functions-style code under `functions/`.

See `cloudflare deployment notes.md` for Cloudflare-specific setup.
