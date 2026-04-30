# Upgrade Boundary

This project separates framework code from tenant content so another company site can be upgraded by copying one generated framework package.

## Build The Upgrade Package

From the source project, run:

```text
.\scripts\build-upgrade-package.ps1
```

Then copy everything inside `_upgrade_framework/` into the target company project root.

## Never Overwrite Tenant Content

Do not copy these paths during a framework upgrade:

```text
src/content/
public/uploads/
.env
.env.*
```

`src/content/site/settings.json` stores the company name, short brand, logo, language mode, SEO defaults, and contact defaults. It belongs to the target company and must not be overwritten by framework upgrades.

## Package Contents

The generated package includes:

```text
src/app/
src/pages/
src/content.config.ts
scripts/
docs/
astro.config.mjs
keystatic.config.ts
package.json
package-lock.json
tailwind.config.mjs
tsconfig.json
README.md
.gitignore
.env.example
.editorconfig
```

The generated package must not include:

```text
src/content/
public/uploads/
.git/
node_modules/
dist/
.env
```

## Smoke Checks After Upgrade

Run these checks in the target project after copying the package:

```text
npm install
npm run build
```

Then verify:

```text
/
/zh/
/en/
/zh/contact
/en/contact
```

For language-mode checks, set `src/content/site/settings.json` to `zh_only` or `en_only` once and confirm the disabled language redirects to the configured default language.
