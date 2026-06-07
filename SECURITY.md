# Security Policy

## Reporting A Vulnerability

Please do not post vulnerabilities, suspected secrets, tokens, or private
operational details in public issues or pull requests.

Report security concerns privately to the MoonCat DAO maintainers through an
appropriate private channel. If you are not sure which channel to use, contact a
maintainer and ask for a private security-reporting path before sharing details.

## Secret Handling

Do not commit:

- `.env*`
- `.dev.vars*`
- OAuth client secrets
- Session secrets
- GitHub tokens
- Cloudflare credentials
- Private keys

Required secret values belong in the hosting provider or GitHub Actions secret
store, not in this repository.

If a real secret is committed or exposed, remove it from the code and rotate the
credential. Deleting the file or line alone is not enough.
