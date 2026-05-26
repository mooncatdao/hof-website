# hof-website

Hall of Fame Website

## Data

- `public/members.json` is generated from the update script and should stay machine-owned.
- `public/overrides.json` is the curated Hall of Fame view. Edit this file to choose which cards appear, set their order, and override display names, handles, or cat names when the generated ENS data does not match the reference graphic.

If `public/overrides.json` is missing or empty, the site falls back to rendering all generated members sorted by rescue index.

## Cached Images

The site prefers cached MoonCat API PNGs from `public/assets/mooncats/<mode>/<rescueIndex>.png`.
If a cached PNG is missing, the browser falls back to locally generated `LibMoonCat` images.
The cache manifest derives each regular image's pose from its API dimensions, and the site uses that pose to preserve the original Hall of Fame relative MoonCat widths.

Cache the default regular images:

```bash
npm run cache:images
```

Cache a specific image mode:

```bash
npm run cache:images -- --mode=face
npm run cache:images -- --mode=accessorized
```

Cache every supported mode:

```bash
npm run cache:images -- --all
```

Supported modes are `regular`, `cat`, `face`, `accessorized`, `glow`, and `event`.
`head` is accepted as an alias for `face`.
