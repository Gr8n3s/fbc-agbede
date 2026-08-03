# Review prompt — FBC Agbede

A standing prompt for reviewing this codebase along its three load-bearing
axes: **security**, **architecture**, and **whether the congregation can
actually use the thing**. Paste it whole, or copy it to
`.claude/commands/audit.md` to run it as `/audit`.

---

## The prompt

You are reviewing **FBC Agbede — Chapel of Grace**, the PWA for First Baptist
Church Agbede, Ikorodu. Read `README.md` and `docs/DATA-PRIVACY.md` before
forming any opinion; they are the design, not decoration.

### What this app is

React 19 + TypeScript + Vite, served as a static site from GitHub Pages. There
is no backend, no database and no paid service — deliberately, because a church
office cannot have its membership register held hostage by a billing change.
The parts a backend would have provided are met directly:

- **Published tier** — impersonal church information in `public/content/*.json`,
  committed to this public repo, served to everyone. Written by the admin
  editor, which commits through the GitHub Contents API (`src/lib/github.ts`).
- **Vault tier** — everything that identifies a person: members, families,
  attendance, prayer requests, the audit trail, the GitHub token. AES-256-GCM
  under the admin's passphrase, in IndexedDB, on one device
  (`src/lib/crypto.ts`, `src/lib/db.ts`, `src/context/VaultContext.tsx`).
- **Three doors** — the build-time access gate (`src/lib/access.ts`), the vault
  passphrase (`src/routes/admin/VaultGate.tsx`), and the GitHub token that lives
  inside the vault.

### Invariants — a change that breaks one of these is wrong, however elegant

1. No `Member`, `AttendanceRecord`, `PrayerRequest`, note or audit entry ever
   reaches `public/content/*.json`, a commit, a URL, an analytics call or any
   third-party request. The repository is public and git history is forever.
2. The GitHub token stays inside the encrypted vault. Never `localStorage`,
   never a content file, never a log line, never an error message.
3. Nothing personal is written to IndexedDB, `localStorage` or a backup file in
   plaintext. Encrypt-then-store, always.
4. Zero recurring cost and zero new runtime dependencies on paid or expiring
   services. Adding a hosted API is a product decision, not a refactor.
5. The public site works with no network, no login and no JavaScript-heavy
   gatekeeping. A visitor should never meet the admin area by accident.

### Part 1 — Security

Work the threat model, not a checklist. The threats that matter here:

- **A curious visitor or crawler** reaching `/admin`. What actually stops them,
  and does the gate oversell itself? `access.ts` ships a PBKDF2 hash to every
  visitor by design — confirm the honesty of that framing still holds and that
  `VITE_ADMIN_KEY_HASH` is set in `.github/workflows/deploy.yml` for the
  published build.
- **A stolen or shared laptop.** Idle auto-lock, the lock button, what survives
  in memory after locking, what `sessionStorage` retains, and whether "stay
  unlocked" is still opt-in with the trade-off stated at the point of choosing.
- **A stolen `.fbcvault` backup.** It is a full copy of the register. Is the
  passphrase strength gate real (`assessPassphrase`), are KDF parameters
  (600k PBKDF2-SHA256, per-file salt, per-encryption IV) still applied on every
  path, and does decryption fail closed on tampering?
- **A leaked GitHub token.** Is the guidance still "this repo only, Contents:
  read & write, nothing else"? Does any error path or toast echo the token?
- **Untrusted content rendered as HTML.** `src/components/site/RichText.tsx` and
  anything touching `dangerouslySetInnerHTML`, uploaded filenames, or external
  URLs (sermon audio/video links, downloads) — check for XSS and for
  `target="_blank"` without `rel="noopener noreferrer"`.
- **Supply chain and headers.** New dependencies, and what a static host can
  still do: CSP, referrer policy, SRI where applicable.

For each finding give: the concrete attack, the file and line, the realistic
blast radius given the other two doors, and a fix that does not weaken the
zero-cost constraint. Say plainly when a risk is an accepted trade-off already
documented in `DATA-PRIVACY.md` — do not relitigate those as findings.

### Part 2 — Architecture

The codebase is ~11k lines of TypeScript with several files over 800 lines
(`src/lib/types.ts`, `src/routes/admin/MembersPage.tsx`,
`src/routes/admin/AttendancePage.tsx`). Assess:

- **Boundary integrity.** Is the published/vault split enforced by types and
  module structure, or only by convention and care? Could a future contributor
  cross it without noticing? If the answer is "only by care", propose the
  smallest change that makes the boundary structural.
- **Where logic lives.** Business rules belong in `src/lib/*`; routes should
  render. Flag rules that have leaked into components, and duplicated
  date/schedule/statistics logic across `schedule.ts`, `stats.ts`, `utils.ts`.
- **Data model.** `types.ts` is the contract for both tiers and for the on-disk
  vault format. Check versioning and migration: what happens when an admin
  restores an old `.fbcvault` after a schema change?
- **Failure and offline paths.** Publish that half-succeeds, a commit conflict,
  a token expiring mid-publish, IndexedDB unavailable (private mode, quota),
  `crypto.subtle` unavailable over plain HTTP.
- **Exit cost.** The README promises that moving to a hosted API later means
  writing the API, not rewriting the app. Is that still true?

Prefer consolidation over new abstraction. Do not propose a state library, a
backend, or a rewrite; propose the change that removes the most duplication for
the least churn, and name the files.

### Part 3 — The congregation using it seamlessly

The audience is a church congregation in Ikorodu, Lagos: mid- and low-end
Android phones, metered and intermittent mobile data, a wide age range, many
users for whom this is the only "app" the church has. Judge the public routes
(`src/routes/public/*`) as those people would.

- **First open on a bad connection.** Measure, don't guess: the `dist/` payload
  is currently ~7.5 MB. What does a first visit actually download before the
  home page is readable? Is route-splitting doing its job, are fonts and images
  the bulk, and does the admin bundle ever reach a congregant?
- **Offline.** Content uses StaleWhileRevalidate and media CacheFirst
  (`vite.config.ts`). Does a member who opened the app on church WiFi still get
  service times, the order of service, the devotional and the bulletin on the
  bus home? What does an uncached page look like offline — a useful message or
  a broken shell?
- **Install and update.** Is `InstallPrompt` honest and dismissible, and does
  `UpdatePrompt` (registerType `prompt`) explain what "update" means to someone
  who has never seen a service worker?
- **Reachability.** Can a member find service times, giving details, the current
  bulletin and how to contact the church within two taps of opening? Check
  `BottomNav` ordering against what people actually come for.
- **Legibility and touch.** Type sizes and contrast for older eyes in bright
  daylight and in dark mode; tap targets ≥44px; forms usable one-handed;
  Nigerian phone numbers and dates formatted the way they are read locally.
- **Accessibility.** Keyboard and screen-reader paths, focus order in overlays
  and modals, alt text on gallery photos, headings that form a real outline.
- **The prayer request path** specifically: it collects the most sensitive thing
  a congregant will type. Is it clear where that goes and who reads it?

Ground every UX claim in a file, a measurement or a rendered check — not in
general best practice.

### How to report

Order findings by real-world harm to this church, not by category. For each:
what breaks, for whom, the file and line, and the smallest fix. Separate
**must fix** (breaks an invariant or a congregant's use of the app) from
**worth doing** from **deliberate trade-off, leave it**. If the answer to a
section is "this is already sound", say so in one line and move on — padding a
review with restated documentation is a failure mode here.

Do not change code unless asked. Review first.
