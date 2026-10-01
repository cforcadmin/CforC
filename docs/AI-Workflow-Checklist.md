# AI Workflow Checklist

Companion to `CLAUDE.md`. Where `CLAUDE.md` says *what the rules are*, this says
*what to do before, during and after a change* — and gives each step a check
that can actually be run, so it fails loudly instead of being nodded at.

Every example below is a real failure from this repository, with its date. None
of it is hypothetical.

---

## 1 · Before the first line of code

**The quality of the solution is decided before any code is written.** The job
is not "write the thing asked for" — it is to work out which thing is right, and
say so.

- [ ] **State the underlying goal in one line**, not the requested mechanism.
      «Add a slider» was really «I want to see the email bigger». The second has
      more solutions than the first.
- [ ] **Name the constraint that eliminates options.** Budget, licence, missing
      data, disk, the freeze window (mid-Oct → 20 Dec 2026). A solution that
      ignores a constraint is not a solution.
- [ ] **Enumerate the full option space, never two.** If exactly two options are
      about to be offered — especially "do the risky thing" vs "give up" — stop
      and keep looking. There is almost always a cheaper third.
- [ ] **Every option carries its time, and the fastest adequate one goes first.**
      Each alternative states how long it takes and **how many steps the user
      performs** — a login, a dashboard click, an interactive prompt each cost
      several times a step that can be run here. Anything >50% slower than the
      fastest adequate option is flagged as slower, with the reason it is still
      worth it. Never bury the quick option as a "fallback" beneath the one that
      seems more correct.
- [ ] **Check what already exists before building new.** The preview size went
      into the existing `colWidths` of `OcPrefs`, so «Επαναφορά διάταξης παντού»
      already resets it: no new endpoint, no new storage, no new reset button.
- [ ] **Say the price.** Download *and* installed footprint, runtime, annual
      cost, and whether it is reversible. Disk here runs at ~98%.

> **30/9/2026.** Box 3's key catalogue was written from a one-line `grep` over
> `process.env`. Three of its `required` judgements were wrong because the
> fallback sat on the *next* line. The screen then reported a working feature as
> «νεκρή στην παραγωγή». Planning failure, not a coding failure.

---

## 2 · The code change is the small part

A change is rarely just code. Before calling anything done, sweep for the
siblings it implies:

- [ ] tests · [ ] types · [ ] config · [ ] docs · [ ] env vars (local **and**
      Vercel) · [ ] Strapi schema + permissions · [ ] cron/schedules ·
      [ ] monitoring · [ ] the data map (`lib/dataMap.ts`) if a field was added

**Enumerate the category first, implement second.** When touching one member of
a kind, find every member of that kind before changing any of it.

```bash
# the sweep that should have been run the first time
grep -rn "<the thing>" --include=*.ts --include=*.tsx app lib components scripts
```

> **30/9/2026.** The dead Strapi host appeared in **6 places across 5 files** —
> including a live «Strapi Admin» link in the OC pointing at a host returning
> 503. Fixing only the one that was noticed would have left five.

> **29/9/2026.** A connectivity check was built for ΕΣΟΔΑ-ΕΞΟΔΑ alone. Six other
> Google files existed, including the CforC Μητρώο.

---

## 3 · Execute and validate as one loop

Not write-then-hope. Build → run → read the failure → fix → re-run.

```bash
npm test                      # NEVER pipe it — see below
npx tsc --noEmit              # compare the error COUNT to the session baseline
node --check <script>.js      # for plain node scripts
```

- [ ] **Record the baseline at session start** and compare against it, not
      against zero. This repo's typecheck exits non-zero on pre-existing errors
      in `__tests__/`; "38 errors, all in `__tests__/`" is green here.
- [ ] **Never pipe test output** to `tail`/`grep`/`head`. The pipe returns the
      *pipe's* exit code, so a total failure can read as success. Run it bare
      and read the summary.
- [ ] **Never chain a commit behind `npm test &&`** with a filter — the filter
      succeeds and the commit lands on broken tests.
- [ ] **Never `build` while a dev server runs** — same output directory.
- [ ] **After two failed fixes, stop and gather evidence** (curl, logs,
      `cat -A`, checksums). Do not try a third variation.

---

## 4 · Produce evidence, not output

Volume of change is not progress. Every delivery answers all five:

| Question | What satisfies it here |
|---|---|
| **What changed?** | Files and the reason each one was touched |
| **Why?** | The cause, not the symptom |
| **What could break?** | The sibling that *wasn't* changed, and why it's safe |
| **Downstream impact?** | Production, Vercel env, Strapi permissions, cron, other repos |
| **Did it achieve the objective?** | A command and its real output — not an assurance |

- [ ] **Never say "fixed" without verified proof.** Quote the command and the
      result. A passing test run, a status code, a fresh clone.
- [ ] **Verify against the real thing**, not a local proxy. The history purge
      was confirmed by cloning from GitHub and counting objects, not by
      inspecting the local repo that had just been rewritten.
- [ ] **Distinguish measured from inferred.** Say which it is.
- [ ] **A visual change not seen is not delivered.** Secure eyes *before* the
      first layout edit, as a single blocking question — not as a footnote under
      delivered code.

> **30/9/2026.** Four visual changes shipped unseen in a row; the user found
> three bugs by screenshot that would have been obvious in ten seconds.

---

## 5 · Verification is the bottleneck, not execution

An agent can change 500 files faster than any human can review them. Keep each
change reviewable **by construction**:

- [ ] One logical change per commit, with the *why* in the message
- [ ] Prefer a sweep that proves completeness (`grep` showing 0 remaining) over
      a claim of completeness
- [ ] When a change is too large to review line by line, provide the **check**
      that makes reviewing unnecessary: a count, a diff of counts, a fresh-clone
      verification, a before/after baseline
- [ ] Edit by **exact-text anchors**, never line numbers or offsets. When a
      match is ambiguous, map each occurrence to its enclosing function first —
      "found 2, replaced 2" does not say *where*

---

## 6 · Before saying "done"

- [ ] Tests run bare, summary read, compared to baseline
- [ ] Typecheck compared to baseline
- [ ] Siblings swept and the result stated
- [ ] Deployment side named (Vercel env vars, Strapi permissions, cron) — a
      required step, not a post-deploy reminder
- [ ] `docs/` staged — all of it, including files unrelated to the task
- [ ] Asked before pushing; after an approved push, offered the regression run
- [ ] Anything left undone is **named**, not quietly dropped
