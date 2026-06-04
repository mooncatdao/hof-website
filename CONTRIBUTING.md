# Contributing

Thanks for helping improve the MoonCats Hall of Fame website. This guide covers
the local development workflow, the generated and curated data files, and what
to include in a pull request.

For a project overview, start with [README.md](README.md). Security notes and
follow-up items are recorded in [SECURITY_AUDIT.md](SECURITY_AUDIT.md). This
project is licensed under the terms in [LICENSE](LICENSE).

## Prerequisites

- Git
- Node.js 22
- npm

The package metadata currently allows Node.js 20 or newer, but the GitHub
workflows use Node.js 22 and the installed Wrangler version requires Node.js
22. Use Node.js 22 for local development so your environment matches CI.

## Local Setup

Clone the repository and install dependencies:

```bash
git clone https://github.com/mooncatdao/hof-website.git
cd hof-website
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

Wrangler serves the static files from `public/` and the Cloudflare
Pages Functions-compatible routes from `functions/`.

## Data Files

The site uses two data files with different ownership rules:

- `public/members.json` is generated. Do not edit it manually.
- `public/overrides.json` is curated. Edit it to choose which cards appear,
  set their order, and override display names, handles, or cat names.

Regenerate `public/members.json` with:

```bash
npm run build
```

The build script reads Ethereum mainnet and ENS data, so it requires network
access and may update the tracked `public/members.json` file.

You can edit `public/overrides.json` directly or use the admin editor. When the
admin editor is served locally, it can preview changes and export a replacement
JSON file.

## Image Cache

Cached MoonCat PNGs live under `public/assets/mooncats/`, with metadata stored
in `public/assets/mooncats/manifest.json`.

The cache supports these variants:

- `regular`
- `glow`
- `accessorized`
- `accessorized-glow`

After changing `public/overrides.json`, refresh the cache:

```bash
npm run cache:images
```

That command reads curated rescue indexes from `public/overrides.json` and
updates the tracked regular cached images and manifest. To refresh all variants,
run:

```bash
npm run cache:images -- --all
```

To refresh one variant, run:

```bash
npm run cache:images -- --variant=glow
```

On `main`, the `Cache MoonCat Images` GitHub Actions workflow also refreshes
and commits all supported image cache variants after relevant changes are
merged.

## DAO Website Sync

The public Hall of Fame viewer is mirrored into
`mooncatdao/mooncatdao-website` by
`.github/workflows/sync-public-hof-to-dao-site.yml`.

On pushes to `main` that change public viewer files, and on manual
`workflow_dispatch` runs, the workflow copies the static HOF files into the
target repo's `hof/` directory. If those files changed, it commits and pushes
directly to `mooncatdao/mooncatdao-website` `main`; it does not open a pull
request in the target repo.

Because this sync bypasses target-repo PR review, review source PRs carefully
when they change public viewer files, `public/members.json`,
`public/overrides.json`, cached assets, or the sync workflow itself.

## Admin And Cloudflare

The public Hall of Fame is a static site. The admin editor has two modes:

- Local or static hosting: the editor can preview changes and export a
  replacement `overrides.json`.
- Configured Cloudflare deployment: GitHub OAuth organization login protects
  `/admin.html`, and the Save button can commit normalized overrides through
  the GitHub contents API.

Local preview does not need production secrets. Maintainers configuring OAuth,
server-side saves, or deployment should follow
[cloudflare deployment notes.md](cloudflare%20deployment%20notes.md).

## Testing And Style

Before opening a pull request, run:

```bash
npm test
```

Also run the commands relevant to your change:

```bash
npm run build
npm run cache:images
npm run preview
```

- Run `npm run build` when validating generated member data changes.
- Run `npm run cache:images` after curated override changes.
- Use `npm run preview` for a browser smoke test of affected pages.

The repository does not currently have automated formatting or lint scripts.
Preserve the existing style, keep edits focused, and keep documentation
readable.

## Issues And Pull Requests

Start with an existing GitHub issue or open one before making a substantial
change. Keep each pull request focused and reference the issue it addresses.

In the pull request description:

- Summarize the user-visible or contributor-facing change.
- List the commands you ran.
- Call out changes to generated files, curated data, or cached assets.
- Include screenshots for visual changes when useful.

Do not commit secrets. In particular, never commit `.env*`, `.dev.vars*`,
OAuth client secrets, session secrets, GitHub tokens, or private keys. The
local environment file patterns are ignored by Git, but review your diff
before committing.

For security-sensitive changes, read [SECURITY_AUDIT.md](SECURITY_AUDIT.md)
and avoid posting secret values in issues or pull requests.
