# CforC Operational Center (OC) — Membership & Finance: Technical Design

**Version 0.1 — Architecture specification for implementation review**
Author role: system architect (Claude, chat). Implementer: Claude Code.
Scope of this version: **new-member flow + financer Income section**. Renewals/arrears engine is designed at schema level only (Phase 2).

---

## 0. How to use this document (instructions to Claude Code)

1. **Read the existing repository first.** The site is React (frontend, deployed on Vercel) + Strapi v5 (CMS/backend, cloud-hosted). Diff this design against what exists: member content-type, auth flow, roles, existing member-directory filtering (to be reused in the OC "New members" list).
2. Do not invent behavior not specified here. Where this document says **[INPUT PENDING]**, stub the interface, mark it clearly, and ask Yoryos rather than guessing.
3. All user-facing UI strings are **Greek**. Code, comments, API in English.
4. **Accessibility parity is non-negotiable**: the OC must work with the site's existing accessibility controls (text sizing, contrast modes, dyslexia-friendly font, motion pause). No component may hard-code font sizes/colors that bypass those mechanisms; respect `prefers-reduced-motion`.
5. The full electronic-voting machinery from the companion document `OC-Membership-Flow-GR.md` is **built but dormant** (feature-flagged). The live v1 path is the manual/admin-recorded path described here. Nothing in the schema may block later activation of full voting.

---

## 1. System overview

```
React (Vercel)
 ├── Public site (existing)
 ├── /oc  — Operational Center (board back office, 7 seats)
 └── /pay-confirm/:token — member "I paid" landing page (public, tokenized)

Strapi v5 (cloud)
 ├── Content types (source of truth): member, membership-application,
 │     income-entry, oc-settings, receipt-counter, audit-log
 ├── Custom plugin "oc": state machine, receipt generator, reminder cron,
 │     magic-link tokens, role gating
 └── Adapters (swappable): StorageAdapter, SheetsAdapter, MailAdapter
       └── v1 implementations: Google Drive, Google Sheets, Gmail
           (@cultureforchange.net Workspace, service account / OAuth)
```

**Architectural rule — the adapter boundary.** All Google touchpoints go through three narrow interfaces. No workflow code may import Google SDKs directly. This is the stage-2 de-Google flexibility requirement: replacing Google later must mean writing new adapter implementations only.

```ts
interface StorageAdapter {
  archiveFile(file: Buffer, filename: string, folderRef: string): Promise<{fileId: string, webViewLink: string}>;
}
interface SheetsAdapter {
  appendRow(sheetRef: string, tab: string, row: Record<string, string|number>): Promise<void>;
}
interface MailAdapter {
  send(msg: {from: string; to: string[]; cc?: string[]; subject: string;
             htmlBody: string; attachments?: {filename: string, content: Buffer}[]}): Promise<{messageId: string}>;
}
```

Sender identities (Google Workspace): `hello@cultureforchange.net` = Admin, `finance@cultureforchange.net` = Financer, `community@cultureforchange.net` = Community.

---

## 2. Roles and seats

Seven OC seats (from OC-Membership-Flow-GR.md): Συντονιστής/-τρια, Κοινότητα, Επικοινωνία, Outreach, Ταμίας (Financer), Γραμματεία (Admin), IT.

- **All seats see the same information** (applications, statuses, history).
- Extra **actions** are role-gated:
  - **Admin (Γραμματεία):** record board votes, click Εγκρίθηκε/Απορρίφθηκε.
  - **Financer (Ταμίας):** Πληρωμή ελήφθη / Πληρωμή απέτυχε, record income entries, edit next-receipt-number, edit archive folder & sheet references. **Only the financer can record a payment.**
  - **Community (Κοινότητα):** "Υπενθύμιση μέλους" button (payment reminder email to applicant); postpone control shared with financer.
- Voting rights (dormant electronic path): 5 voters, coordinator double weight, per the OC document. Schema stores votes regardless of entry path.

---

## 3. Data model (Strapi content types)

### 3.1 `member` (extend existing)
Add **hidden/internal fields** (not exposed on the public site; Yoryos: "change our schema and add hidden the users variables"):

| Field | Type | Notes |
|---|---|---|
| `membershipStatus` | enum: `active`, `new_pending`, `arrears_1`, `arrears_2_warned`, `removed`, `left` | derived, see §7 |
| `memberSince` | date | never changes after first completion |
| `receiptProfile` | enum: `person`, `company` | default `person` |
| `companyName`, `companyAddress`, `companyVat` | strings, optional | used only when `receiptProfile=company` (see §6.3) |
| `paymentYears` | JSON `[ {year, incomeEntryId} ]` | per-year ledger; drives Phase-2 arrears logic |
| `internalNotes` | text, OC-only | |

Receipt personal data (ΕΠΩΝΥΜΟ, ΟΝΟΜΑ, ΤΗΛΕΦΩΝΟ, ΠΟΛΗ) is **read from Strapi**, never from spreadsheets. Sheets are write-only outputs of this system.

### 3.2 `membership-application`
One row per applicant, retained permanently (the "New members" section keeps full history from launch onward).

| Field | Type |
|---|---|
| `applicant` data | name, surname, email, phone, city, + application-form fields (mirror existing site application flow) |
| `state` | enum, see §4 |
| `votes` | JSON: `[ {seat, vote: yes/no/abstain, weight, enteredBy, enteredAt, mode: 'recorded_by_admin' | 'electronic'} ]` |
| `decision` | `{result, decidedAt, recordedBy, note}` |
| `magicLinkToken` | hashed token + `usedAt` |
| `paymentClaimedAt` | datetime, null |
| `linkedMember` | relation → member (created/linked on completion) |
| `reminderState` | `{nextReminderAt, postponedBy[], resolved}` |
| timestamps | appliedAt, approvedAt, completedAt, rejectedAt |

### 3.3 `income-entry`
Single table for the financer's Income section, two kinds.

| Field | Type | Membership | Project |
|---|---|---|---|
| `kind` | enum `membership` / `project` | ✔ | ✔ |
| `paymentDate` | date | ✔ | ✔ |
| `amount` | decimal € | computed from lines | manual |
| `method` | enum `bank` / `cash` | ✔ (cash = General Assembly) | ✔ |
| `member` | relation | ✔ | — |
| `projectName` | string | — | ✔ |
| `lines` | JSON `[ {label, qty, unitPrice} ]` e.g. ΕΓΓΡΑΦΗ 10€, ΣΥΝΔΡΟΜΗ 2026 35€ | ✔ | — |
| `receiptNumber`, `receiptSeries` (`Α`) | int / string | ✔ | — |
| `receiptIssuedAt` | date | ✔ | — |
| `driveFileId`, `driveLink` | from StorageAdapter | ✔ (receipt PDF) | ✔ (proof file link, pasted or uploaded) |
| `emailStatus` | `sent` / `failed` / `n/a` + messageId + sentAt | ✔ | n/a |
| `yearsCovered` | int[] (e.g. `[2025,2026]` for catch-up) | ✔ | — |

### 3.4 `oc-settings` (singleton, financer-editable in UI)
- `archiveFolderRef` — current quarterly Drive folder for receipt PDFs (**manually changed every 3 months** by financer; show current value + "last changed" date prominently).
- `projectProofFolderRef` (optional).
- `sheetRefs` — the two bookkeeping Google Sheets IDs + tab names. **[INPUT PENDING: exact sheet formats/column mapping from Yoryos — stub `SheetsAdapter` mapping behind a config object.]**
- `reminderIntervalDays` — default **5**.
- `iban`, bank name (for payment-instruction email), fee amounts (`registrationFee=10`, `annualFee=35`) — configurable, not hard-coded.

### 3.5 `receipt-counter` (singleton)
- `series` = `Α`, `nextNumber` = int. **Editable by financer in the UI** (to absorb manually issued receipts outside the system). On issue: read → use → increment atomically (single DB transaction; Strapi lifecycle or DB-level lock to prevent double issue).
- Series covers **membership receipts only**.

### 3.6 `audit-log`
Append-only: `{when, who(seat/user), action, applicationId?, incomeEntryId?, payload}`. Never deleted. Every state change, vote entry, override, payment confirmation, receipt issue, email send, settings change.

---

## 4. Application state machine (v1 live path)

```
SUBMITTED ──(admin records votes + clicks Εγκρίθηκε)──► APPROVED
SUBMITTED ──(admin clicks Απορρίφθηκε)───────────────► REJECTED  [end]
APPROVED  ──(auto, same transaction)─────────────────► PAYMENT_REQUESTED
PAYMENT_REQUESTED ──(member clicks magic link)───────► PAYMENT_CLAIMED
PAYMENT_REQUESTED ──(financer: Πληρωμή ελήφθη, bypass)► COMPLETED
PAYMENT_CLAIMED   ──(financer: Πληρωμή ελήφθη)───────► COMPLETED  [end]
PAYMENT_CLAIMED   ──(financer: Πληρωμή απέτυχε)──────► PAYMENT_REQUESTED (email sent; reminder cycle continues)
```

Notes:
- The dormant electronic-voting path plugs in before APPROVED/REJECTED using the weighted rules in `OC-Membership-Flow-GR.md` (5 voters, coordinator weight 2, secret until close, tie → 3-day revote, 14-day cap). Implement behind feature flag `ELECTRONIC_VOTING=false`. The UI must *show* the electronic option as available-but-unused ("second way of deciding").
- Manual admin decision is recorded as the OC document's **manual-override** path: justification/note optional in v1, always audit-logged.
- REJECTED: Community's OC surfaces a draft polite-rejection email (send as-is or edit-then-send), per the OC document. Other seats informed in-OC, no email.

### Transition side-effects

**→ PAYMENT_REQUESTED (on approval):**
1. New entry visible in **all seven OCs** under Members → Νέα μέλη, status Εκκρεμεί (pending).
2. Automated email to applicant from `community@`: welcome, payment instructions (IBAN, amount: 45€ first year = ΕΓΓΡΑΦΗ 10 + ΣΥΝΔΡΟΜΗ 35), and the **magic link**. Template **[INPUT PENDING]**.
3. Reminder engine starts (§5).

**→ COMPLETED (on Πληρωμή ελήφθη) — the automation cascade, one transaction where possible:**
1. Create `income-entry` (kind=membership) from the confirmation dialog (financer enters/confirms: payment date, method, years covered; lines auto-derived).
2. **Receipt PDF** generated (§6), numbered from `receipt-counter`.
3. **Archive** PDF via StorageAdapter into current `archiveFolderRef`.
4. **Sheets**: append rows to both bookkeeping Google Sheets via SheetsAdapter. **[INPUT PENDING: format]**
5. **Email** from `finance@` to the new member: official welcome (template **[INPUT PENDING]**, includes link to their member profile), receipt PDF attached, **cc: finance@, community@, hello@**.
6. `member` record created/linked; `membershipStatus=active`; `memberSince` set; `paymentYears` updated; applicant appears in Members → Τακτικά μέλη; application row retained in Νέα μέλη history with status Ολοκληρώθηκε.
7. All OC seats see status change Εκκρεμεί → Ολοκληρώθηκε.
8. Audit log everything; `emailStatus` recorded on the income entry.

Failure handling: if any downstream step (archive, sheets, email) fails, the receipt number is still consumed and the entry saved; the entry shows per-step status with a **retry** action per step. Never silently roll back a consumed receipt number.

---

## 5. Reminder engine (cron in Strapi, runs daily)

- While an application is in PAYMENT_REQUESTED or PAYMENT_CLAIMED:
  - Every **5 days** (configurable): reminder to **financer** ("check the bank") and to **community**, in-OC notification + email.
  - **Postpone** button (financer or community): resets that seat's next reminder +5 days. Logged.
- Community's OC: **Υπενθύμιση μέλους** button → sends polite payment-reminder email to the applicant from `community@` (template **[INPUT PENDING]**). Logged; show "last reminded on…" next to the button.
- Reminders stop on COMPLETED / REJECTED.

---

## 6. Receipt generation

### 6.1 Template
Reproduce the provided sample (`Δείγμα_Αποδείξεις_CforC.pdf`) faithfully: CforC letterhead block (logo, Σωματείο details, Λεωφόρος Αλεξάνδρας 48, ΤΚ 11473 Αθήνα, ΑΦΜ 996788256, site, email), ΣΤΟΙΧΕΙΑ ΠΑΡΑΣΤΑΤΙΚΟΥ (Απόδειξη Είσπραξης, Σειρά, Αρ. Παραστατικού, Ημερομηνία), ΠΑΡΑΤΗΡΗΣΕΙΣ, ΣΤΟΙΧΕΙΑ ΜΕΛΟΥΣ, line-item table (ΑΙΤΙΟΛΟΓΙΑ/ΥΠΗΡΕΣΙΑ/ΤΙΜΗ ΜΟΝΑΔΟΣ/ΑΞΙΑ), totals block, amount-in-words box, bank line (ALPHA BANK IBAN), stamp/signature area, «Για την είσπραξη».

Implementation suggestion (Claude Code decides against repo reality): HTML→PDF (e.g. headless Chromium/Puppeteer or @react-pdf) server-side in the Strapi plugin. Fonts must render Greek correctly.

### 6.2 Variable fields (everything else is static)
- Αρ. Παραστατικού (from counter), Ημερομηνία (receipt issue date), ΣΤΟΙΧΕΙΑ ΜΕΛΟΥΣ (from `member` in Strapi), lines, totals, amount-in-words.
- ΠΑΡΑΤΗΡΗΣΕΙΣ: `Τραπεζική Κατάθεση` (method=bank) / `Μετρητά` (method=cash).
- Lines: first year → ΕΓΓΡΑΦΗ 1×10,00€ + ΣΥΝΔΡΟΜΗ {year} 1×35,00€ (total 45). Renewal → ΣΥΝΔΡΟΜΗ {year} 1×35,00€. Multi-year catch-up → **one receipt**, one ΣΥΝΔΡΟΜΗ line per year.
- **Amount in words**: implement a Greek number-to-words function (e.g. 45 → «Σαράντα πέντε Ευρώ», 35 → «Τριάντα πέντε Ευρώ», 70 → «Εβδομήντα Ευρώ»). NOTE: the sample PDF shows «Σανταπέντε Ευρώ», which appears to be a typo for «Σαράντα πέντε» — generate correct Greek; flag to Yoryos for confirmation.

### 6.3 Company variant (`receiptProfile=company`)
Field substitutions on the receipt only: ΕΠΩΝΥΜΟ→Όνομα εταιρίας, ΟΝΟΜΑ→Διεύθυνση εταιρίας, ΤΗΛΕΦΩΝΟ→ΑΦΜ εταιρίας, ΠΟΛΗ unchanged. Selectable per member (default person), overridable per receipt at confirmation time.

### 6.4 Filename & archive
`Απόδειξη_{series}{number}_{Surname}_{YYYY-MM-DD}.pdf` (Claude Code: confirm safe-charset handling for Greek filenames in Drive; keep Greek — Drive supports it). Archived to `archiveFolderRef` (quarterly folder, manually set in settings).

---

## 7. Membership year-ledger (Phase 2 — schema now, logic later)

Calendar-year model. `paymentYears` on `member` is the ledger. Rules (do **not** implement automation yet; design only):
- Fee due per calendar year; payable anytime within the year; approval in month N still owes the full current year; no proration, no discounts.
- 2 consecutive unpaid years → at the start of year 3: automated warning; no response/payment → removal flow.
- Removal consequences (checklist, partly manual): profile off public site, internal-newsletter unsubscribe, private-area access revoked, Facebook-group removal (manual task item), election/participation rights flag.
- Open decision (board): hard-delete vs deactivate+anonymize (retain financial ledger/receipts for accounting-retention obligations). Schema must support `removed` without row deletion.

---

## 8. OC frontend (`/oc`)

### 8.1 Navigation & design language
- Top bar of **section tags** in the Inside Spaceman pattern — first letter in a filled block, remainder in a tinted panel, one accent hue per section via CSS custom property (`--tc`-style) — but with **CforC's own visual identity** (colors/typography per site brand; NOT the spacecraft/monospace aesthetic). Sections v1: **Επισκόπηση** (overview), **Μέλη** (Members), **Οικονομικά** (Finances), **Ρυθμίσεις** (Settings; role-gated contents). Reserve space for future sections (Projects, Comms).
- Greek UI throughout; fully compatible with the site accessibility menu (§0.4).
- Auth: reuse the site's existing member auth with an OC role claim per seat; verify current flow in repo before deciding (report findings).

### 8.2 Μέλη (Members) — all seats
- **Νέα μέλη** (applications): table of all applications from launch onward, retained permanently. Columns: name, applied date, state (Εκκρεμεί ψήφιση / Εκκρεμεί πληρωμή / Δηλώθηκε πληρωμή / Ολοκληρώθηκε / Απορρίφθηκε), key dates. **Sort/filter like the public member directory** (reuse that component logic). Row → detail view: application data, votes (and the dormant electronic-vote panel), timeline, audit trail, role-gated action buttons.
- **Τακτικά μέλη**: completed members list; per-member view shows ledger (`paymentYears`), receipts issued, status.

### 8.3 Οικονομικά (Finances) — visible to all seats? 
**[INPUT PENDING: confirm whether all seats see Income, or financer(+admin?) only. Default until answered: visible to Financer and Admin; hidden elsewhere.]**
- **Έσοδα (Income)** — two tabs:
  - **Συνδρομές**: table per §3.3 — Αρ. απόδειξης, Όνομα, Ημ. πληρωμής, Ημ. έκδοσης, Ποσό, [Άνοιγμα στο Drive] button, email-sent indicator (✓/✗ + retry). Primary action: **Καταχώριση πληρωμής** → dialog: member picker (searches Strapi members *and* pending applications), payment date, method, years covered, receiptProfile override → confirm → runs the §4 cascade (for pending applications this IS the Πληρωμή-ελήφθη path; for existing members it is a renewal entry, Phase 2 emails TBD).
  - **Έργα (Projects)**: table — Ημ. πληρωμής, Ποσό, Όνομα έργου, [Αρχείο στο Drive] link. Simple create form; no receipt, no email.
- **Settings (financer-only):** next receipt number (editable), quarterly archive folder, sheet references, reminder interval, fee amounts, IBAN.

### 8.4 Public tokenized page
`/pay-confirm/:token` — no login, no member dashboard. Single action page: on valid token → thank-you page in site's brand & language («Ευχαριστούμε — ενημερώσαμε τον/την Ταμία μας…» per OC doc), marks PAYMENT_CLAIMED, notifies financer's OC with deep link to the entry. Token: single-purpose, hashed at rest, **valid until the application resolves** (not 24–48h — payment may take weeks), idempotent (second click = same thank-you, no state change). Invalid/expired → friendly page pointing to finance@ / hello@.

---

## 9. Email matrix (v1)

| # | Trigger | From | To | cc | Attachment |
|---|---|---|---|---|---|
| E1 | Approval → payment instructions + magic link | community@ | applicant | — | — |
| E2 | Rejection (draft, Community sends/edits) | community@ | applicant | — | — |
| E3 | Community clicks Υπενθύμιση μέλους | community@ | applicant | — | — |
| E4 | 5-day internal reminder | system (hello@) | finance@, community@ | — | — |
| E5 | Πληρωμή απέτυχε | finance@ | applicant | — | — |
| E6 | Πληρωμή ελήφθη → official welcome | finance@ | new member | finance@, community@, hello@ | receipt PDF |

All templates **[INPUT PENDING from Yoryos]** — Greek, HTML + plaintext fallback. E5 must mention contacting admin via hello@ or financer via finance@.

---

## 10. Implementation phases (proposed)

- **P1a** — Schema (all §3 types), state machine, OC shell (nav, Members lists), admin decision flow, E1. 
- **P1b** — Magic link + /pay-confirm page, reminder cron, community reminder button, E3–E5.
- **P1c** — Receipt generator + counter, Google adapters (Drive archive, Sheets append, Gmail send), Πληρωμή ελήφθη cascade, E6, Income section (both tabs).
- **P1d** — Dormant electronic voting UI + weighted logic behind flag; audit-log views.
- **P2** — Renewals for existing members, arrears warnings, removal flow, historic-years import (~110 members), accountant export.

## 11. Open inputs required from Yoryos (tracked)

1. Two bookkeeping Google Sheets: IDs + exact column formats & append rules.
2. Email templates E1–E6 (Greek).
3. Confirm Finances-section visibility (all seats vs financer+admin).
4. Current next receipt number at go-live.
5. Historic payment-years data for existing members (Phase 2).
6. Board decision: hard-delete vs deactivate on removal (Phase 2).
7. Confirm amount-in-words spelling (sample shows «Σανταπέντε»).
8. Receipt template source file (if a .docx/.xlsx template exists, provide it; otherwise Claude Code rebuilds from the sample PDF).

## 12. Security & data-protection notes for implementation

- Magic-link tokens: ≥128-bit random, stored hashed, single-purpose, no account access.
- OC routes: server-side role checks in Strapi (never trust frontend gating).
- Google service credentials: server-side only (Strapi env), never in the React bundle; least-privilege scopes (Drive: file-level; Sheets: the two sheets; Gmail: send-as for the three addresses).
- Personal data of applicants/members is GDPR-relevant: minimize what the OC displays per seat if the board later asks; audit log already provides accountability.
- Receipt PDFs contain personal data — the quarterly Drive folder must be access-restricted to the board Workspace accounts.
