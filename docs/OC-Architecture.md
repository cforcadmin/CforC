# Operational Center (OC) — how it is built

A handover document for an engineer (or another Claude Code instance) building a
similar role-based back office. It describes **construction and rationale**, not
features. Where a decision cost us something to learn, the cost is stated.

Written 2026-09-27 against the CforC codebase. The author knows the campaigns
module in depth and the other modules structurally — sections marked
*(pattern only)* describe the shape without having read every line.

---

## 1. What it is

A back office for the board of a Greek cultural NGO, living **inside the public
Next.js site** rather than as a separate app. Board members log in with the same
session cookie ordinary members use; the OC is one route, `/oc`, gated on the
server.

Roughly: member registry, membership applications with weighted voting, finance
(expenses, receipts, bank intake, monthly close), tasks, calendar and
attendance, a document library, indicators, and a full email/newsletter
composer. ~25 API routes, ~30 Strapi collections, 5 cron jobs.

**Why inside the site and not a separate app:** one auth system, one deploy, one
Strapi. The board is eight people — a second app would have doubled the
maintenance for no benefit. This is the right call below roughly 20 users; above
that, the shared bundle starts to hurt.

---

## 2. Stack

| Layer | Choice | Note |
|---|---|---|
| App | Next.js 15 App Router, TypeScript | Server Components by default |
| CMS / DB | Strapi v5 Cloud | The only persistence. No second database. |
| Auth | Custom JWT in an httpOnly cookie | Magic link + password |
| Transactional email | Resend | 100/day on the free plan — a real constraint |
| Bulk email | Sender.net | Lists, unsubscribe handling |
| Hosting | Vercel | **Hobby plan — cron may run at most once per day** |
| Styling | Tailwind, `dark:` variants throughout | |

There is no Redis, no job queue, no separate worker. Everything durable is a
Strapi row; everything scheduled is a Vercel cron hitting an API route.

---

## 3. The access model — seats, not permissions

This is the single most important design decision and the one worth copying.

There is **no permissions table**. There are eight named **seats**, and a member
holds a seat because the *current* Coordination Team row in Strapi points at
them through a relation field:

```ts
// lib/ocRoles.ts — server only, never import into a client component
export type OcSeat =
  | 'coordinator' | 'admin' | 'comms' | 'it'
  | 'community' | 'financer' | 'outreach' | 'media'

const SEAT_FIELDS = [
  { field: 'Coordinator', seat: 'coordinator' },
  { field: 'Admin',       seat: 'admin' },
  // … one relation per seat on the coordination-team collection
]
```

`resolveOcAccess(memberId)` reads the row with `IsCurrent=true`, returns
`{ isBoard, seats }`, and caches for five minutes. Board composition changes
once a year; a Strapi round-trip on every request would be absurd.

**Consequences that make this pay off:**

- Elections are a content edit, not a migration. Point the relations at new
  people and the whole OC re-roles itself.
- Seats are *positions*, not people. Email goes to the seat's mailbox
  (`finance@`, `communication@`), so it survives the holder changing and lands
  in an inbox the successor can read.
- A member can hold several seats. The UI has an **active seat**, stored in an
  httpOnly cookie, and a modal to switch. Every server route reads that cookie
  and validates it against the member's actual seats — *never trusts it*.

**Derived facts live in code, not in the database**, each with one source of
truth:

```ts
// lib/ocRoles.ts
export const VOTING_SEATS = ['coordinator','comms','financer','community','outreach']
export function voteWeight(seats) { return seats.includes('coordinator') ? 2 : 1 }

// components/oc/ocPrefs.ts
export const OC_EMAIL_DESKS = {            // which seats share a mail desk
  overview: ['coordinator','outreach'], members: ['community'],
  finances: ['financer'], comms: ['comms','media'], admin: ['admin'],
}
export const OC_SECTION_ACCESS = { media: ['comms'] }   // seats with narrowed view
```

Note `voteWeight` takes the member's **whole seat list**, not the active seat:
the double vote belongs to the office, not to whichever tab is open. Getting
that wrong would have let someone change their voting power by switching tabs.

Note also the `hasOwnProperty` guards when looking up a seat or section by a
string from the network — a key like `toString` would otherwise return a
function off the prototype and the `.includes` below would throw.

---

## 4. Page and component architecture

```
app/oc/page.tsx          Server Component. THE security barrier.
  └── components/oc/OcShell.tsx     ('use client') tabs, seat switching, layout
        └── OcOverview / OcFinances / OcCampaigns / OcTasks / …
```

**The gate is server-side and silent:**

```ts
const decoded = verifyToken(sessionCookie.value)
if (!decoded || decoded.type !== 'session') redirect('/')
const access = await resolveOcAccess(decoded.memberId)
if (!access.isBoard) redirect('/')
```

A redirect, not a 403 page: an ordinary member who guesses the URL should not
learn that the OC exists. Every OC button elsewhere in the site is cosmetic —
this check is the actual barrier, and each API route repeats it independently.

**Sections** are a literal array in `OcShell`, each with a key, a Greek title
and a hue. Visibility is filtered per seat, and there is a per-seat landing
section so each role opens at its own desk. One guard is worth copying: if the
user switches to a seat that cannot see the current section, the shell moves
them to their first visible section rather than rendering blank.

Each section is one client component owning its own state and its own `fetch`
calls. They do not share a store. At eight components this is simpler than any
state library; it does mean `OcCampaigns.tsx` has grown to 2,800 lines, which
is past the point where it should have been split.

---

## 5. API route shape

Every OC route follows the same skeleton:

```ts
async function authorize() {
  const decoded = verifyToken(cookies().get('session')?.value)
  if (!decoded || decoded.type !== 'session') return { error: json(401) }
  const access = await resolveOcAccess(decoded.memberId)
  if (!access.isBoard) return { error: json(403) }
  // active seat from cookie, VALIDATED against the member's real seats
  const activeSeat = access.seats.includes(seatCookie) ? seatCookie
                   : access.seats.length === 1 ? access.seats[0] : null
  if (!activeSeat || !ALLOWED_SEATS.includes(activeSeat)) return { error: json(403) }
  return { memberId: decoded.memberId, activeSeat }
}
```

`GET` returns everything the screen needs in one response — rows plus the
metadata that drives the UI (labels, option lists, presets, budgets). The
client renders options the server declares, so adding a variant is a server-side
change.

`POST` is **action-dispatched**: one route, `{ action: 'save' | 'queue' |
'preview' | … }`. Fewer files, and all the authorisation for a domain sits in
one place where you can see it whole.

**Ownership is re-checked on the server for every mutation**, e.g. a draft
belongs to a *desk*, and a seat from another desk gets 403 even if it guessed
the id. The UI hiding a button is not a security control.

---

## 6. Strapi v5 realities

These cost real time; they are not in the docs prominently enough.

1. **`documentId`, not `id`.** All single-entry operations use the string
   `documentId`. Scripts should fetch a list first and build an `id →
   documentId` map.
2. **No `attributes` wrapper** (v4 → v5 change). Data sits directly on the object.
3. **Media needs explicit population**: `?populate=Visuals`.
4. **Pagination defaults to 25 and clamps at 100.** Use a `fetchAllPaginated`
   helper everywhere; a limit of 1000 silently gives you 100.
5. **`default:` applies only at row creation.** It never backfills existing rows.

### The deploy-order trap, and the two patterns that fix it

Strapi Cloud deploys from its own git repo, **separately from the web app**. So
there is always a window where the app knows about a field the database does
not. In that window:

> A `fields[]` query naming an unknown field returns **400 Invalid key** and
> takes **every sibling field with it** — the list comes back empty and the data
> looks *lost*.

Two patterns, both required:

**Tiered reads** — newest fields in the outermost tier, fall back inward:

```ts
const BASE    = 'fields[0]=Subject&fields[1]=State&…'
const SIGNER  = BASE   + '&fields[12]=Signer'
const ARCHIVE = SIGNER + '&fields[13]=Archived&fields[14]=ArchivedAt'
const DESK    = ARCHIVE+ '&fields[15]=Desk'
const FULL    = DESK   + '&fields[16]=Kind'

let list = await strapi(url(FULL))
if (!list.ok) list = await strapi(url(DESK))
if (!list.ok) list = await strapi(url(ARCHIVE))
// …and a final tier that returns rows without scoping, because showing
// everything beats showing nothing — the list is an archive, not a secret.
```

**Progressive writes** — drop the newest fields one at a time, newest first:

```ts
const DROP_ORDER = ['Footer','Kind','Groups','Selection','Desk','FooterStyle', …]
let attempt = { ...payload }
let res = await write(attempt)
for (const field of DROP_ORDER) {
  if (res.ok || res.status !== 400) break
  if (!(field in attempt)) continue
  delete attempt[field]
  res = await write(attempt)
}
```

Dropping one at a time rather than the whole group means a save loses as little
as possible. **Prefer a JSON column over an enum** for anything that will grow:
adding a value to an enum needs a schema deploy, whereas JSON absorbs new shapes
with a `normalise()` function on read.

---

## 7. Long work: the drain pattern

Vercel functions are request-scoped. Anything that outlives a request needs a
queue, and the queue is just a Strapi row with a `State` field.

```
state: draft → queued → sending → sent
```

The rule that matters: **one implementation, two callers.**

```ts
// lib/campaignDrain.ts
export async function drainCampaigns(opts: { budget?, timeBudgetMs?, onlyId? })
```

- The **cron route** calls it with the day's budget.
- The **user's action route** calls it with `onlyId` right after queueing, so a
  message to three people leaves immediately instead of waiting for morning.

Both `import` the same function. **Never let one route call another over HTTP.**
A previous version chained Vercel → Apps Script → back into Vercel "for DRY" and
produced mangled responses after the work had already succeeded. Reuse belongs
in a shared lib; remote systems do only their own half.

Other properties worth copying:

- **Persist after every single item**, not at the end of the loop. A timeout
  halfway through must not re-send to people who already received it.
- **Two budgets**: a send budget (provider limit) and a *time* budget, since the
  function will be killed. Both are checked inside the loop.
- **Failures are recorded with an attempt count** and retried on later runs, up
  to a cap.
- `export const maxDuration = 300` on any route that sends mail or builds PDFs.
  The default is far too short and the failure is a silent truncation.

### The budget bug worth internalising

`DAILY_EMAIL_BUDGET` was applied **per invocation** while the cron ran **once a
day** — so the two coincided and nobody noticed. The moment a second pass exists
in a day (an hourly cron, or just the immediate drain above), a fresh budget per
pass multiplies the real send. The fix counts what actually went out today from
the recipients' own `sentAt` stamps, and **refuses to send if it cannot count**
— a silent zero would read as "full budget available".

> A constant named for a period is an intention, not a guarantee. Something has
> to enforce the period.

---

## 8. Email as data, not as HTML

Campaign bodies are stored as a **JSON array of typed blocks** and rendered to
HTML at send time, never stored as HTML.

```jsonc
[ { "type": "section", "title": "Νέα", "variant": "modern", "look": "coral" },
  { "type": "text", "html": "<p>…</p>" },
  { "type": "card", "title": "…", "imgPos": "left", "imgSize": "medium" } ]
```

Because rendering happens at send time, a change to the visual identity applies
to old drafts too. The same array renders three ways: the email, a plain-text
alternative, and an annotated preview whose blocks are clickable.

If you copy this, copy the email-HTML constraints too — they are not optional:

- Tables and inline styles. **Outlook ignores `max-width`**, so every table needs
  an explicit `width`.
- `margin: auto` does not centre. Use `<table align="center" width="N">`.
- `border-radius` is ignored by Outlook — accept square corners there.
- 600–640px total width.
- A missing glyph in an embedded font does not degrade, it **throws**. Greek
  plus emoji is a common way to discover this.

---

## 9. Preferences in httpOnly cookies

Not `localStorage`. Content blockers and private windows wipe it, and the values
were needed on the server anyway for the initial render (which section to open,
which seat is active). Cookie names are shared constants in `ocPrefs.ts`, read by
`app/oc/page.tsx` and written through `/api/oc/prefs`.

Keep genuinely per-device, non-security preferences (a remembered column width)
in `localStorage` — but wrap every access in `try/catch` and render correctly
when it returns nothing.

---

## 10. Traps, ranked by what they cost

1. **A `return null` from a CSS-grid child does not hide it — it shifts every
   later sibling one column left.** Three declared columns, two children: the
   third element lands in the middle `auto` column and takes its content width,
   crushing the first. Render an empty cell instead.
2. **Vercel Hobby rejects any cron more frequent than daily, at *build* time.**
   The deployment fails; it does not warn and downgrade. One such change blocked
   every deploy for seven hours.
3. **Debounce does not cancel an in-flight request.** Two changes further apart
   than the debounce send two requests, and the screen keeps whichever *returns*
   last. Every debounced fetch needs an `alive` guard in the effect cleanup.
4. **Greek `toUpperCase()` keeps accents** («Νέα» → «ΝΈΑ»). Strip diacritics via
   NFD for any all-caps Greek.
5. **A shell pipeline returns the *last* command's exit code.** `npm test | tail`
   exits 0 while every test fails. Write full output to a file.
6. **Unsubscribe at the bulk provider is global and irreversible via API.** A
   test send that anyone clicks costs that mailbox permanently.
7. Source-scanning tests (grep the file, assert on substrings) drift into false
   alarms as the file grows. Three such tests failed in one day and the code was
   right every time.

---

## 11. What I would do differently

- **Split the big client components earlier.** 2,800 lines in one file is past
  the point where an edit is safe without reading the whole thing.
- **Put one schema-version marker in Strapi** and read it once, instead of
  discovering field availability through tiered 400s. The tiers work, but they
  are a workaround for not knowing what is deployed.
- **Decide the scheduler up front.** Building on Vercel cron and discovering the
  plan's limit afterwards forced a redesign. If precise timing matters, drive the
  endpoint from a machine you control; the endpoint is already secret-protected,
  so it is a single crontab line.
- **Type the block union properly from the start.** It grew organically and the
  renderer now carries casts it should not need.

---

## 12. File map

| Path | Role |
|---|---|
| `app/oc/page.tsx` | Server gate, cookie prefs, initial data |
| `components/oc/OcShell.tsx` | Tabs, seat switching, section visibility |
| `components/oc/ocPrefs.ts` | Shared constants: cookies, desks, section access |
| `components/oc/Oc*.tsx` | One component per section |
| `lib/ocRoles.ts` | Seats, voting weights, `resolveOcAccess` (server only) |
| `lib/ocEmails.ts` | Every transactional email the OC sends |
| `lib/campaignBlocks.ts` | Block types → email HTML / text / preview |
| `lib/campaignDrain.ts` | The queue worker, shared by cron and UI |
| `app/api/oc/*/route.ts` | One action-dispatched route per domain |
| `app/api/cron/*/route.ts` | Bearer-secret guarded; all logic imported from `lib/` |
| `StrapiDBforCforC/` | Separate repo, separate deploy — mind the ordering |

Cron routes check the secret like this, and the `!CRON_SECRET` half is not
redundant — without it the comparison is against `"Bearer undefined"` and anyone
who sends that string gets in:

```ts
if (!CRON_SECRET || request.headers.get('authorization') !== `Bearer ${CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```
