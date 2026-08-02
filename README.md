# FBC Agbede — Chapel of Grace

A Progressive Web App for **First Baptist Church Agbede, Ikorodu**: the public
church website and the church office in one installable app.

It runs at **zero cost, for ever**. There is no server, no database bill and no
paid service anywhere in it — GitHub Pages serves the site, the browser stores
the records, and the app commits its own content updates.

---

## What it does

**For the congregation** — service times and order of service, the church
calendar, sermon notes with audio and video links, a daily devotional and
reading plan, the notice board, departments, prayer points, gallery, downloads,
giving details and contact. Installable, works offline, light and dark.

**For the church office** — the membership register with families, baptism
records and department assignment; attendance registers by service, by head
count or by individual marking; membership growth and attendance reports with
charts and PDF/Excel export; birthday and anniversary reminders; and an editor
for everything the public site shows, which publishes straight to GitHub.

## How it works

```
Congregation ──▶ GitHub Pages ──▶ public/content/*.json   (public, in this repo)
                                          ▲
                                          │ commit, via the GitHub Contents API
                                          │
Church admin ──▶ the app ──▶ encrypted vault in IndexedDB (private, on-device)
```

Two tiers, and the split is deliberate:

- **Published content** — impersonal church information. Lives in
  `public/content/*.json`, is committed to this repository, and is served to
  everyone. Editing happens in the app; a local draft is kept until the admin
  presses **Publish**, which commits the changed files and triggers a rebuild.
- **The vault** — everything that identifies a person. Members, families,
  attendance, prayer requests, the audit trail and the GitHub token. Encrypted
  with AES-256-GCM under the admin's passphrase and held in IndexedDB on one
  device. It is never uploaded anywhere.

Read [`docs/DATA-PRIVACY.md`](docs/DATA-PRIVACY.md) before touching either tier.
It is short, and it is the design.

### Why no backend

The brief was zero cost with no vendor lock-in. A React + Express + PostgreSQL
stack is the conventional answer, but the free tiers that host it expire, sleep,
or start charging — and a church cannot have its register held hostage by a
billing change. So the parts a backend would have provided are met directly:

| Backend would give | What this does instead |
|---|---|
| Database | IndexedDB, encrypted at rest |
| Auth (JWT, bcrypt) | A passphrase that decrypts the vault. Possession of the device *is* the boundary — and it is honest about being a device boundary, not an account |
| REST API | The GitHub Contents API, called directly |
| Hosting | GitHub Pages |
| Backups | Encrypted `.fbcvault` files the admin downloads |
| Audit log | An append-only trail inside the vault |

The trade-offs are real and stated: no multi-user login, no cross-device sync
beyond backup-and-restore, and no password recovery. For one church office with
one or two administrators, that is the right shape. Everything is plain
TypeScript and JSON, so moving to a hosted API later means writing the API — not
rewriting the app.

## Getting started

```bash
npm install
npm run dev          # http://localhost:5173
```

Other scripts:

```bash
npm run build        # type-check, build, and prepare dist/ for GitHub Pages
npm run preview      # serve the production build locally
npm run typecheck    # types only
npm run icons        # regenerate PWA icons after editing public/favicon.svg
npm run seed:encrypt # encrypt an existing register into a .fbcvault file
```

### First run as an administrator

1. Open `/admin`. There is no account to create — the app asks for a **vault
   passphrase**, which is what encrypts the records on this device.
2. **Write the passphrase down.** There is no reset, and no one can recover it.
3. Add departments, then register members, then take a register after a service.
4. Take a backup from **Settings → Backups** and keep it somewhere safe.

### Connecting publishing

To let the app update the website by itself:

1. Create a **fine-grained personal access token** on GitHub, scoped to *only
   this repository*, with **Contents: read and write** — nothing else.
2. Paste it into **Settings → Publishing**. It is stored inside the encrypted
   vault, never in plain browser storage.
3. Edit anything under **Content** and press **Publish**. The change is a commit;
   Pages rebuilds within a minute or two.

## Deployment

Push to `main`. [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
type-checks, builds and deploys to Pages. In the repository settings, set
**Pages → Source → GitHub Actions** once.

The build's base path comes from `BASE_PATH`, which the workflow sets to
`/<repo>/`. For a user page (`<user>.github.io`) or a custom domain, set it to
`/`.

## Project structure

```
public/content/   Published JSON — the church's public data
src/lib/          Domain types, crypto, storage, GitHub client, stats, exports
src/context/      Theme, toasts, published content, the vault
src/components/   UI primitives, layout, site cards
src/routes/public Everything the congregation sees
src/routes/admin  The church office, behind the vault gate
scripts/          Icon generation, post-build, seed encryption
docs/             Data privacy
```

Conventions worth knowing before contributing:

- **No personal data in `public/`.** See the privacy doc.
- **Everything is typed.** `src/lib/types.ts` is the single domain model, split
  explicitly into published and vault halves.
- **Reporting maths lives in `src/lib/stats.ts`** as pure functions, so the
  dashboard, the printed report and the spreadsheet cannot drift apart.
- **Exports use no libraries.** CSV, SpreadsheetML and print-to-PDF are produced
  natively — roughly 700 KB of bundle that a congregation on mobile data does
  not have to download.

## Licence

MIT.
