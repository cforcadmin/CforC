# Apps Script — `updateEmail`

Νέα ενέργεια στο web app του Μητρώου. Τη χρειάζεται το κουτί **«Αλλαγή email
μέλους»** στο OC → Ασφάλεια++ (θέση IT): το site αλλάζει το email στο Strapi,
στο newsletter και στον Sender, και στέλνει εδώ `{ action: 'updateEmail',
oldEmail, newEmail }` για να αλλάξει και το Μητρώο.

Μέχρι να μπει ο κώδικας, το βήμα «Μητρώο» στην οθόνη θα γράφει **ΑΠΕΤΥΧΕ** με
την απάντηση του script — τίποτα δεν χάνεται σιωπηλά, απλώς η αλλαγή στο
φύλλο γίνεται με το χέρι.

## Τι κάνει

Σε **όλα τα φύλλα** (Επισκόπηση, Συνδρομές, Νέα Μέλη, Διαγρ. Μέλη, …) βρίσκει
κάθε κελί που ισούται **ακριβώς** με το παλιό email (χωρίς κενά, αδιάφορο
πεζά/κεφαλαία) και γράφει το νέο. Δεν αγγίζει κελιά που απλώς *περιέχουν* το
email μέσα σε άλλο κείμενο, ούτε τύπους.

Γυρίζει πόσα κελιά άλλαξαν και σε ποια φύλλα — αυτό δείχνει η οθόνη. Μηδέν
κελιά = `ok: true, replaced: 0`: δεν είναι σφάλμα (ίσως άλλαξε ήδη με το χέρι),
και η οθόνη το δείχνει ως «δεν βρέθηκε».

---

## Βήμα 1 — επικόλλησε αυτή τη συνάρτηση στο τέλος του script

Δεν χρειάζεται καμία προσαρμογή. Δεν χρησιμοποιεί καμία σταθερά ή βοηθητική
συνάρτηση του script σου.

```javascript
/**
 * Αντικαθιστά ΚΑΘΕ κελί που ισούται με το παλιό email, σε ΟΛΑ τα φύλλα.
 * Ακριβής ισότητα (trim + πεζά) — όχι «περιέχει», όχι τύποι.
 * Γυρίζει { replaced, sheets } για να το δείξει το site.
 */
function updateEmailEverywhere_(oldEmail, newEmail) {
  var from = String(oldEmail || '').trim().toLowerCase();
  var to = String(newEmail || '').trim();
  if (!from) throw new Error('Λείπει το παλιό email');
  if (!to || to.indexOf('@') === -1) throw new Error('Μη έγκυρο νέο email');

  var sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  var replaced = 0;
  var touched = [];

  for (var s = 0; s < sheets.length; s++) {
    var sheet = sheets[s];
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow < 1 || lastCol < 1) continue;
    var range = sheet.getRange(1, 1, lastRow, lastCol);
    var values = range.getValues();
    var formulas = range.getFormulas();
    var hit = 0;

    for (var r = 0; r < values.length; r++) {
      for (var c = 0; c < values[r].length; c++) {
        // Κελί με τύπο: δεν το γράφουμε — θα χανόταν ο τύπος
        if (formulas[r][c]) continue;
        if (String(values[r][c] || '').trim().toLowerCase() === from) {
          sheet.getRange(r + 1, c + 1).setValue(to);
          hit++;
        }
      }
    }
    if (hit > 0) {
      replaced += hit;
      touched.push(sheet.getName() + ' (' + hit + ')');
    }
  }
  return { replaced: replaced, sheets: touched };
}
```

## Βήμα 2 — το block στον dispatcher

Στο `doPost`, δίπλα στα άλλα `if (body.action === …)` (π.χ. μετά το
`removeApplicant`):

```javascript
    if (body.action === 'updateEmail') {
      var lockE = LockService.getDocumentLock();
      lockE.waitLock(15000);
      var outE, errE = '';
      try {
        outE = updateEmailEverywhere_(body.oldEmail, body.newEmail);
      } catch (e) {
        // Ίδιο μοτίβο με removeApplicant / recordSubscriptionYear: το σφάλμα
        // γυρίζει ως JSON με την αιτία, όχι ως HTML σελίδα που το site δεν διαβάζει.
        errE = String((e && e.message) || e);
      } finally {
        lockE.releaseLock();
      }
      if (errE) return jsonOut_({ ok: false, error: errE });
      return jsonOut_({ ok: true, replaced: outE.replaced, sheets: outE.sheets });
    }
```

Τρία σημεία, ίδια με τις προηγούμενες ενέργειες:

- **`body.action`**, `body.oldEmail`, `body.newEmail` — από το σώμα του
  request, όχι σκέτα ονόματα.
- **Με DocumentLock**: η συνάρτηση ΓΡΑΦΕΙ στο φύλλο. Χωρίς κλείδωμα μπορεί να
  πέσει πάνω σε `decide`/`recordPayment` ή στον trigger `onSheetEdit`.
- **`ok: true`** πάντα όταν έτρεξε — το site ξεχωρίζει μόνο του το
  `replaced: 0`. Ένα `throw` (λείπει email) πιάνεται και γυρίζει
  `ok: false` με την αιτία, που το site δείχνει αυτούσια στο βήμα «Μητρώο».

**Trigger `onSheetEdit`:** τα `setValue` από script ΔΕΝ πυροδοτούν installable
onEdit triggers (μόνο οι αλλαγές από χέρι), άρα δεν θα ξαναστείλει τίποτα στο
site. Αν ο trigger σου έχει δικό του φίλτρο στηλών, δεν χρειάζεται αλλαγή.

## Βήμα 3 — ενεργοποίηση

Αλλαγή στο `doPost` **δεν** ενεργοποιείται με σκέτο Save:

**Deploy → Manage deployments → ✏️ → Version: New version → Deploy**

Ποτέ «New deployment» — αλλάζει το `/exec` URL και σπάει το
`SHEET_WEBAPP_URL` στο Vercel.

---

## Δοκιμή

Από το OC → Ασφάλεια++ → «Αλλαγή email μέλους», με ένα δοκιμαστικό μέλος.

| Βήμα «Μητρώο» στην οθόνη | Τι σημαίνει |
|---|---|
| `έγινε · 3 κελί(ά) σε: Επισκόπηση (1), Συνδρομές (1), Νέα Μέλη (1)` | ✅ |
| `δεν βρέθηκε` | Το script έτρεξε, το παλιό email δεν υπήρχε σε κανένα φύλλο — έλεγξε με το χέρι |
| `ΑΠΕΤΥΧΕ · Sheet web app rejected: …` | Ο dispatcher δεν ξέρει την ενέργεια — δεν μπήκε το Βήμα 2 ή δεν έγινε Deploy |
| `ΑΠΕΤΥΧΕ · μη αναγνωρίσιμη απάντηση` | Το script έπεσε (ReferenceError;) ή κρύα εκκίνηση — ξαναπάτα «Αλλαγή» μόνο αφού δεις τι έγινε στα υπόλοιπα βήματα |

Το **όνομα του φύλλου στην απάντηση** είναι η απόδειξη ότι η αλλαγή έγινε
πραγματικά — όχι ένα σκέτο «ok».
