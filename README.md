![MoonCats Hall of Fame website main page](/index.png)

# MoonCats Hall of Fame

A community-maintained Hall of Fame website for the MoonCats DAO.

The site displays a curated set of MoonCats and their holders using generated on-chain data, manual overrides, cached MoonCat artwork, and a static frontend that can be deployed to Cloudflare or GitHub Pages.

## Features

- Static public Hall of Fame website
- Curated member list using `public/overrides.json`
- Generated member data using Ethereum mainnet, ENS, Delegate.xyz and MoonCats contract data
- Cached MoonCat PNG images for faster loading
- Cloudflare Pages Functions-compatible admin routes
- GitHub OAuth organization login for the admin editor
- Admin Save flow that commits curated overrides back to GitHub
- Automated GitHub Actions workflows for member updates, MoonCat name sync, image caching and GitHub Pages deployment
- Node test suite for admin logic

## License

This project is licensed under the GNU Affero General Public License v3.0 or later (`AGPL-3.0-or-later`).

See:

- `LICENSE`
- `NOTICE.md`

If you modify and deploy this app for users over a network, the AGPL requires you to offer those users the Corresponding Source for the deployed modified version.

## Requirements

Use Node.js 22 for local development.

The package metadata allows Node.js 20 or newer, but the GitHub Actions workflows use Node.js 22 and the current Wrangler version is best matched with Node.js 22.

You will need:

- Git
- Node.js 22
- npm
- Wrangler, installed through project dependencies
- A GitHub account
- A Cloudflare account, if deploying with Cloudflare Pages / Workers

## Local Setup

Clone the repository:

```bash
git clone https://github.com/mooncatdao/hof-website.git
cd hof-website
```

Install dependencies:

```bash
npm ci
```

Run the tests:

```bash
npm test
```

Start a local Wrangler preview:

```bash
npm run preview
```

Wrangler serves static files from `public/` and the Pages Functions-compatible routes from `functions/`.

### Subdirectory Hosting

The public static site is subdirectory-safe. It can be copied from `public/` and hosted at `/hof/` or a similar path because its public assets, cached MoonCat images and JSON data files are loaded with relative URLs.

This applies to the public Hall of Fame page only. The optional admin editor and its authenticated API routes are intended for a deployment that provides the configured root-level Cloudflare Pages Functions routes.

### DAO Website Sync

The `.github/workflows/sync-public-hof-to-dao-site.yml` workflow mirrors the public Hall of Fame viewer into `mooncatdao/mooncatdao-website` at:

```text
public/hof/
```

The synced site is intended to run from `/hof/`. The workflow runs on pushes to `main` when public viewer files change, and it can also be run manually with `workflow_dispatch`. It opens a pull request in `mooncatdao/mooncatdao-website` instead of pushing directly to that repo's main branch.

The source repository must define a GitHub Actions secret named `DAO_WEBSITE_SYNC_TOKEN`. That token needs access to check out `mooncatdao/mooncatdao-website`, push the sync branch, and create the pull request.

Only the public static viewer files are mirrored:

- `public/index.html`
- `public/display-options.js`
- `public/libmooncat-limited.js`
- `public/styles/site.css`
- `public/vendor/starfield.js`
- `public/vendor/starfield.LICENSE.txt`
- `public/assets/**`
- `public/members.json`
- `public/overrides.json`

Admin, auth, API, editor and Cloudflare Functions files are intentionally excluded from the sync.

## Available Scripts

```bash
npm run build
```

Regenerates `public/members.json`.

```bash
npm run cache:images
```

Caches MoonCat images for the curated members listed in `public/overrides.json`.

```bash
npm run sync:cat-names
```

Checks curated MoonCats against the MoonCat API and updates `catName` values in `public/overrides.json` when named MoonCats differ.

```bash
npm run sync:cat-names:check
```

Reports MoonCat API name differences without writing changes. This exits non-zero when updates are needed.

```bash
npm run preview
```

Starts a local Wrangler development preview.

```bash
npm run deploy
```

Deploys with Wrangler.

```bash
npm test
```

Runs the Node test suite.

## Project Structure

```text
.
├── functions/
│   ├── admin.html.js
│   ├── api/
│   │   ├── admin/save-overrides.js
│   │   └── auth/
│   │       ├── callback.js
│   │       ├── login.js
│   │       ├── logout.js
│   │       └── status.js
│   └── _lib/
│       ├── auth.js
│       ├── github.js
│       └── security.js
├── public/
│   ├── admin-core.js
│   ├── admin.html
│   ├── index.html
│   ├── members.json
│   ├── overrides.json
│   ├── styles/
│   │   ├── admin.css
│   │   └── site.css
│   ├── vendor/
│   └── assets/
│       └── mooncats/
│           ├── manifest.json
│           └── regular/
├── scripts/
│   ├── cache-mooncat-images.mjs
│   ├── dayoneclub.mjs
│   └── lib/
├── test/
├── .github/workflows/
├── wrangler.jsonc
├── CONTRIBUTING.md
├── SECURITY_AUDIT.md
└── README.md
```

## Data Files

### `public/members.json`

Generated member data.

Do not edit this file manually.

It is generated by:

```bash
npm run build
```

The build script reads Ethereum mainnet data, ENS metadata, Delegate.xyz delegation data and MoonCat contract data.

The script checks Day One MoonCats using rescue indexes `0` through `491`, resolves owner metadata and writes the enriched output to `public/members.json`.

### `public/overrides.json`

Curated Hall of Fame data.

Edit this file to:

- Choose which cards appear
- Set display order
- Override display names
- Override Twitter/X handles
- Override MoonCat names

If `public/overrides.json` is missing or empty, the site can fall back to generated member data.

### MoonCat Name Sync

The `scripts/sync-mooncat-names.mjs` script checks each curated `rescueIndex` in
`public/overrides.json` against:

```text
https://api.mooncatrescue.com/mooncat/traits/{rescueIndex}
```

When the API reports a named MoonCat, the script trims leading and trailing
whitespace, preserves emoji and other Unicode characters, and updates only that
member's `catName` field. Missing API names do not erase local `catName`
values, and API/network failures prevent the script from writing a partial
update.

The `Sync MoonCat Names` GitHub Actions workflow runs weekly and can also be
started manually. It opens a pull request when `public/overrides.json` changes.
Review those PRs before merging because MoonCat names affect the public Hall of
Fame display.

## MoonCat Image Cache

Cached MoonCat PNGs live in:

```text
public/assets/mooncats/regular/
```

The image cache manifest is stored at:

```text
public/assets/mooncats/manifest.json
```

Refresh cached images with:

```bash
npm run cache:images
```

The cache script reads curated rescue indexes from `public/overrides.json`.

It currently uses the MoonCats community API:

```text
https://api.mooncat.community/image/<rescueIndex>
```

with these image options:

```text
scale=2
padding=0
backgroundColor=transparent
acc=
glow=false
```

Only regular MoonCat images are currently supported by the cache script.

If cached images are missing, the browser can fall back to locally generated `LibMoonCat` images.

![Admin Editor](/admin.png)

## Admin Editor

The admin editor is available at:

```text
/admin.html
```

The editor can:

- Load generated member data
- Load curated overrides
- Preview Hall of Fame cards
- Export a replacement `overrides.json`
- Save normalized overrides to GitHub when deployed with the required Cloudflare and GitHub configuration

The save endpoint validates submitted overrides before committing them. It accepts up to 500 members and only allows rescue indexes from `0` through `491`.

Editable member fields are:

- `name`
- `handle`
- `catName`

## Authentication

When deployed with Cloudflare Pages Functions, the admin editor uses GitHub OAuth.

The OAuth callback URL should be:

```text
https://YOUR_DOMAIN/api/auth/callback
```

Required environment variables:

```text
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
GITHUB_ORG
SESSION_SECRET
GITHUB_REPO
GITHUB_CONTENT_TOKEN
```

Optional environment variables:

```text
ADMIN_SESSION_TTL_SECONDS
GITHUB_BRANCH
GITHUB_OVERRIDES_PATH
```

`SESSION_SECRET` must be at least 32 characters.

The OAuth flow verifies GitHub organization membership. Sessions default to 8 hours and cannot exceed 24 hours.

Local static testing does not provide full GitHub login behavior. Use Wrangler preview or a configured Cloudflare deployment to test authenticated admin saving.

## Deployment

The repository includes both Cloudflare and GitHub Pages-related configuration.

### Cloudflare / Wrangler

`wrangler.jsonc` configures the project name, compatibility date, `public/` assets directory, observability and `nodejs_compat`.

For Cloudflare setup details, see:

```text
cloudflare deployment notes.md
```

### GitHub Pages Workflow

The `Deploy Pages` workflow deploys `public/` to GitHub Pages when relevant files change on `main`, or when manually triggered.

## GitHub Actions

The repository includes these workflows:

### Cache MoonCat Images

Runs when `public/overrides.json`, the cache script, package files, or the workflow itself changes on `main`.

It runs:

```bash
npm run cache:images
```

Then commits updated files under:

```text
public/assets/mooncats
```

### Update Members

Runs every 12 hours and can also be triggered manually.

It runs:

```bash
npm run build
```

Then commits updated `public/members.json` if it changed.

### Deploy Pages

Deploys the `public/` directory to GitHub Pages when relevant public files change on `main`, or when manually triggered.

## Testing

Run:

```bash
npm test
```

Tests currently use Node's built-in test runner.

Before opening a pull request, also run the commands relevant to your change:

```bash
npm run build
npm run cache:images
npm run preview
```

## Contributing

See:

```text
CONTRIBUTING.md
```

Before opening a pull request:

- Keep the change focused
- Run the test suite
- Include screenshots for visual changes
- Mention generated data, curated data or cached asset changes
- Do not commit secrets
- Review `SECURITY_AUDIT.md` before security-sensitive changes

## Security Notes

Do not commit:

- `.env*`
- `.dev.vars*`
- OAuth client secrets
- Session secrets
- GitHub tokens
- Private keys

Admin write access depends on server-side Cloudflare environment variables and a GitHub content token with access to the configured repository.

## Acknowledgements

Built by and for the MoonCats DAO community.

MoonCats is one of the earliest NFT projects on Ethereum and remains an important part of NFT history.
