# Data privacy

This repository is public. Anything committed to it can be read by anyone, for
ever, including in the git history after a later deletion. The app is built
around that fact rather than in spite of it.

## The line

There are exactly two tiers of data, and the boundary between them is a privacy
boundary, not a technical one.

| | **Published** | **Vault** |
|---|---|---|
| Examples | Service times, sermons, events, bulletins, departments, gallery, downloads, prayer points published by the pastor | Members, families, attendance registers, prayer requests submitted by individuals, the audit trail, the GitHub token |
| Where it lives | `public/content/*.json`, committed to this repository | IndexedDB on one device, AES-256-GCM encrypted |
| Who can read it | Everyone | Whoever holds the vault passphrase for that device |
| How it leaves | A commit, made deliberately from the admin's "Publish" button | Only as an encrypted `.fbcvault` backup file the admin downloads |
| Backed up by | Git | Nothing automatic — the admin must download backups |

Personal data never crosses into the published tier. There is no code path that
writes a `Member`, `AttendanceRecord` or `PrayerRequest` into a content file.

## What this means in practice

**Anything identifying a person stays on the device.** A member's phone number,
address, date of birth, baptism record and pastoral notes exist only in the
encrypted vault of whichever device the church secretary uses. They are not on a
server, because there is no server.

**Department leader names are the one deliberate exception,** and they are
entered separately. The public `leaderName` on a department is typed into the
department editor by an admin who has decided to publish it. It is not read from
the member register, so ticking "Leads" on someone's record never publishes them.

**A congregant's own prayer requests are a third case, and the table above
oversimplifies it.** When a member writes a prayer request on the public Prayer
page, it never reaches the admin's vault and never reaches this repository. It
is held in ordinary browser storage on *their own phone*, in the clear, until
they choose to send it to the pastor over WhatsApp or email. Two honest points
about that:

- There is no congregant passphrase, so there is nothing to encrypt it under.
  A key derived from the device would be decoration, not protection — anything
  the page can derive, a script on the page can derive too.
- Phones here are frequently shared within a family. So a request that has been
  sent is kept for fourteen days as a record and then cleared automatically, and
  anything can be deleted by hand at any time. Unsent drafts are never purged:
  losing someone's unsent request would be worse than keeping it.

The page says all of this on screen. Nothing is transmitted until the member
presses send, and what is sent is a message they can read in full first.

**The GitHub token lives inside the vault,** not in `localStorage`. It can write
to this repository, so it gets the same protection as the register. Scope it to
this one repository with `Contents: read and write` and nothing else — then the
worst case for a leaked token is a bad commit that can be reverted and a token
that can be revoked.

## The honest limits

- **There is no password reset.** The vault passphrase is the only key. Nobody —
  not the church, not the developer, not GitHub — can recover it. Lose it, and
  the records on that device are unrecoverable without a backup file.
- **Security rests on the passphrase.** Given a stolen backup file, a weak
  passphrase is brute-forceable offline. The app refuses weak ones and offers to
  generate a strong one; use it.
- **The device is the perimeter.** Malware on the admin's machine, or someone
  who walks up to it while the vault is unlocked, can read everything. Hence the
  30-minute idle auto-lock and the lock button in the header.
- **"Stay unlocked" uses `sessionStorage`,** which any script on this origin can
  read. It survives a page reload and dies with the tab. It is opt-in, and the
  trade-off is stated at the point of choosing.
- **A backup is a full copy of the register.** Treat a `.fbcvault` file with the
  same care as the paper register — it is the same data, and it is only as safe
  as its passphrase.

## Rules for anyone working on this repository

1. Never commit a `.fbcvault` file, a seed JSON containing real members, or an
   export from the Members page. `.gitignore` covers the usual names, but it
   cannot catch a file you rename.
2. Never add a personal field to a published type in `src/lib/types.ts`. If
   something identifies a person, it belongs in the vault half of that file.
3. Never log vault contents. `console.log(vault)` in a shared browser session is
   a data breach.
4. If personal data does reach a commit, rotating the token is not enough — the
   data must be purged from the history (`git filter-repo`) and everyone told to
   re-clone. Treat it as an incident.

## Deleting someone's data

A member can be deleted outright from the Members page, which also strips their
id from every attendance register. Because nothing was ever published or
uploaded, that deletion is complete the moment the vault is saved — with one
caveat worth stating to anyone who asks: older `.fbcvault` backups still contain
them, so old backups should be destroyed too.
