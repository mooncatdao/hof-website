# Hall of Fame Website

## License

This project is licensed under the GNU Affero General Public License v3.0 or
later (`AGPL-3.0-or-later`). See `LICENSE` and `NOTICE.md`.

If you modify and deploy this app for users over a network, the AGPL requires
you to offer those users the Corresponding Source for the deployed modified
version.

## Data

- `public/members.json` is generated from the update script and should stay machine-owned.
- `public/overrides.json` is the curated Hall of Fame view. Edit this file to choose which cards appear, set their order, and override display names, handles, or cat names when the generated ENS data does not match the reference graphic.

If `public/overrides.json` is missing or empty, the site falls back to rendering all generated members sorted by rescue index.

## Cached Images

The site prefers cached MoonCat API PNGs from `public/assets/mooncats/regular/<rescueIndex>.png`.
If a cached PNG is missing, the browser falls back to locally generated `LibMoonCat` images.
The cache uses the customizable MoonCat image endpoint with `scale=2`, no padding, transparent background, no accessories, and no glow so every cat can render at a uniform source scale inside the same fixed image height.

Cache the MoonCat images:

```bash
npm run cache:images
```

## Admin

`public/admin.html` is a static editor for `public/overrides.json`. It loads the generated member data and cached image manifest, previews the Hall of Fame, and exports a replacement `overrides.json` file.

After replacing `public/overrides.json` with an exported copy, run `npm run cache:images` to cache images for any newly added rescue indexes and refresh image metadata.
On `main`, GitHub Actions also refreshes and commits `public/assets/mooncats` automatically when `public/overrides.json` changes.

Run the admin unit tests:

```bash
npm test
```

### GitHub Login

The admin page can show GitHub organization login status when deployed on Cloudflare Pages Functions.
Local `python3 -m http.server` testing will show GitHub login as unavailable because it only serves static files.
On Cloudflare, `/admin.html` is served through a Pages Function and redirects unauthenticated visitors to GitHub login.

Create a GitHub OAuth app with this callback URL:

```text
https://YOUR_DOMAIN/api/auth/callback
```

Set these Cloudflare Pages environment variables/secrets:

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_ORG`
- `SESSION_SECRET` at least 32 characters
- `GITHUB_REPO` in `owner/name` format
- `GITHUB_CONTENT_TOKEN` with Contents read/write access to the repo
- `ADMIN_SESSION_TTL_SECONDS` optional, defaults to 8 hours, maximum 24 hours
- `GITHUB_BRANCH` optional, defaults to `main`
- `GITHUB_OVERRIDES_PATH` optional, defaults to `public/overrides.json`

The OAuth flow requests GitHub's `read:org` scope so private organization membership can be verified.
The admin Save button uses `GITHUB_CONTENT_TOKEN` server-side to commit the exported overrides JSON through GitHub's repository contents API.
