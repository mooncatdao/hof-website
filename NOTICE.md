# Notices

## Project License

MoonCats Hall of Fame Website is licensed under the GNU Affero General Public
License, version 3 or any later version (`AGPL-3.0-or-later`).

The AGPL is a network copyleft license. If you modify this project and let
users interact with the modified version over a computer network, you must
prominently offer those users access to the Corresponding Source for the
modified version at no charge, as described in AGPL section 13.

For this web app, a deployment should include a visible source-code link or
equivalent notice that points users to the exact source for the deployed
version, including local changes and build/deployment scripts needed to
reproduce it.

## Copyright

- Project code and documentation: Copyright (C) 2026 MoonCat DAO.
- Vendored MoonCat rendering code: Copyright (C) 2021 ponderware.

## Vendored And Third-Party Code

### MoonCat Rendering Helpers

- Files:
  - `public/libmooncat-limited.js`
  - `scripts/lib/libmooncat.js`
- Upstream/provenance: MoonCat rendering helper code from ponderware,
  modified for this project as noted in the file headers.
- License: GNU Affero General Public License v3, as stated in the file headers.
- Notes: These files also embed third-party pako code; see the pako notice
  below.

### pako

- Files:
  - Embedded in `public/libmooncat-limited.js`
  - Embedded in `scripts/lib/libmooncat.js`
- Upstream/provenance: nodeca/pako 0.2.7, as stated in the embedded bundle
  headers.
- License: MIT and ZLIB combination, as stated in the MoonCat helper file
  headers.

### Starfield

- Files:
  - `public/vendor/starfield.js`
  - `public/vendor/starfield.LICENSE.txt`
- License: MIT License.
- Notes: The full license notice for this vendored file is preserved at
  `public/vendor/starfield.LICENSE.txt`.

### npm Dependencies

Runtime and development npm dependencies are declared in `package.json` and
locked in `package-lock.json`. Their package-level license metadata remains
with the packages installed by npm.

## Release Checklist For AGPL Compliance

- Keep this repository public, or otherwise provide complete Corresponding
  Source to all users of any network-deployed modified version.
- Preserve copyright and license notices in source files and vendored files.
- Keep third-party license files and notices with distributions.
- Make sure deployed pages include a visible source link or equivalent legal
  notice before public launch.
