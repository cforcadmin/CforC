# Apps Script — `removeApplicant`

Νέα ενέργεια στο web app του μητρώου («Νέα Μέλη»). Τη χρειάζεται η **αυτόματη
διαγραφή εγκεκριμένης αίτησης που δεν πληρώθηκε** μέσα στην προθεσμία των 30
ημερών (`/api/cron/payment-reminders`, §4α).

Χωρίς αυτήν, η αίτηση σβήνεται από το Strapi αλλά η γραμμή μένει στα
ΕΓΚΕΚΡΙΜΕΝΑ με ονοματεπώνυμο, email και τηλέφωνο — δηλαδή ακυρώνεται η
υπόσχεση που έδωσαν τα γράμματα των 15 και των 28 ημερών. Μέχρι να μπει ο
κώδικας, το email ειδοποίησης προς hello@/community@/finance@ γράφει τη
γραμμή ως **εκκρεμότητα** για διαγραφή με το χέρι· τίποτα δεν χάνεται
σιωπηλά.

## Γιατί καθαρίζει τη γραμμή αντί να τη διαγράφει

Το φύλλο «Νέα Μέλη» έχει **τρία μπλοκ το ένα κάτω από το άλλο**: Προς έγκριση,
ΕΓΚΕΚΡΙΜΕΝΑ, ΜΗ ΕΓΚΕΚΡΙΜΕΝΑ.

Ένα `deleteRow()` στα ΕΓΚΕΚΡΙΜΕΝΑ θα ανέβαζε όλο το από κάτω μπλοκ κατά μία
γραμμή και θα χάλαγε κάθε σταθερό όριο του script. Οπότε:
**`clearContent()` στη γραμμή, όχι διαγραφή γραμμής.** Για τα προσωπικά
δεδομένα το αποτέλεσμα είναι το ίδιο· η δομή του φύλλου μένει όρθια.

---

## Βήμα 1 — επικόλλησε αυτή τη συνάρτηση στο τέλος του script

Δεν χρειάζεται καμία προσαρμογή. Δεν χρησιμοποιεί καμία σταθερή ή βοηθητική
συνάρτηση του script σου: βρίσκει μόνη της το φύλλο και το μπλοκ.

```javascript
/**
 * ΤΟΝΟΙ: το toUpperCase() στα ελληνικά ΚΡΑΤΑΕΙ τον τόνο — «Εγκεκριμένα» γίνεται
 * «ΕΓΚΕΚΡΙΜΈΝΑ», που ΔΕΝ περιέχει «ΕΓΚΕΚΡΙΜΕΝΑ». Χωρίς αφαίρεση τόνων η
 * αναζήτηση του μπλοκ αποτυγχάνει σιωπηλά σε κάθε τίτλο που δεν είναι ήδη
 * κεφαλαία. (Το toLocaleUpperCase('el') τους ρίχνει, αλλά πειράζει και το ς.)
 */
function normGreek_(v) {
  return String(v == null ? '' : v)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

/**
 * Σβήνει τα περιεχόμενα της γραμμής ενός/μιας εγκεκριμένου/ης αιτούντα/ούσας
 * από τα ΕΓΚΕΚΡΙΜΕΝΑ, όταν πέρασε άπρακτη η προθεσμία πληρωμής (GDPR).
 *
 * ΔΕΝ διαγράφει γραμμή: τα μπλοκ είναι το ένα κάτω από το άλλο και θα
 * μετακινούνταν τα από κάτω. Καθαρίζει τα κελιά και μόνο.
 */
function removeApplicantRow_(email) {
  var wanted = String(email || '').trim().toLowerCase();
  if (!wanted) throw new Error('Λείπει το email');

  var sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  var seen = [];
  var blockSheet = '';

  for (var s = 0; s < sheets.length; s++) {
    var sheet = sheets[s];
    seen.push(sheet.getName());
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow < 2 || lastCol < 1) continue;
    var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();

    // Όρια του μπλοκ: από τον τίτλο «ΕΓΚΕΚΡΙΜΕΝΑ» ως τον τίτλο «ΜΗ ΕΓΚΕΚΡΙΜΕΝΑ».
    // ΠΡΟΣΟΧΗ: το «ΜΗ ΕΓΚΕΚΡΙΜΕΝΑ» περιέχει τη λέξη «ΕΓΚΕΚΡΙΜΕΝΑ». Χωρίς τον
    // έλεγχο του «ΜΗ» θα κλείδωνε στο λάθος μπλοκ και θα καθάριζε λάθος γραμμή.
    var start = -1, end = lastRow;
    for (var r = 0; r < values.length; r++) {
      var line = normGreek_(values[r].join(' '));
      var negative = line.indexOf('ΜΗ ΕΓΚΕΚΡΙΜΕΝΑ') !== -1;
      if (start === -1) {
        if (line.indexOf('ΕΓΚΕΚΡΙΜΕΝΑ') !== -1 && !negative) start = r + 1;
      } else if (negative) {
        end = r;
        break;
      }
    }
    if (start === -1) continue;
    blockSheet = sheet.getName();

    for (var i = start; i < end; i++) {
      for (var j = 0; j < lastCol; j++) {
        if (String(values[i][j] || '').trim().toLowerCase() === wanted) {
          sheet.getRange(i + 1, 1, 1, lastCol).clearContent();
          return { blockFound: true, sheet: blockSheet, row: i + 1 };
        }
      }
    }
  }

  // ΔΕΝ πετάει: ένα throw γυρίζει HTML σελίδα σφάλματος και η αιτία χάνεται.
  // Γυρίζει τη διάγνωση, ώστε να φαίνεται στην απάντηση του web app.
  if (!blockSheet) return { blockFound: false, sheet: '', row: 0, sheetsSeen: seen };

  // Βρέθηκε το μπλοκ, δεν βρέθηκε η γραμμή: ίσως καθαρίστηκε ήδη με το χέρι.
  return { blockFound: true, sheet: blockSheet, row: 0 };
}
```

## Βήμα 2 — το block στον dispatcher

Στο `doPost`, ανάμεσα στο `decide` και στο `bulkImport`:

```javascript
    if (body.action === 'removeApplicant') {
      var lockR = LockService.getDocumentLock();
      lockR.waitLock(15000);
      try {
        out = removeApplicantRow_(body.email);
      } finally {
        lockR.releaseLock();
      }
      return jsonOut_(out.blockFound
        ? { ok: true, cleared: out }
        : { ok: false, error: 'Δεν βρέθηκε το μπλοκ ΕΓΚΕΚΡΙΜΕΝΑ', diagnostic: out });
    }
```

Τρία σημεία, το καθένα από λάθος που έγινε την πρώτη φορά:

- **`body.action`**, όχι σκέτο `action` — έτσι το γράφουν όλα τα υπόλοιπα
  branches· χωρίς το `body.` πετάει ReferenceError και πέφτει όλο το request.
- **Με DocumentLock**, όπως τα `decide` και `bulkImport`: η συνάρτηση ΓΡΑΦΕΙ
  στο φύλλο (καθαρίζει κελιά). Χωρίς κλείδωμα μπορεί να πέσει πάνω σε
  ταυτόχρονο `decide` ή στον trigger `onSheetEdit`.
- **`cleared`**, όχι `row`: η `removeApplicantRow_` γυρίζει αντικείμενο
  `{sheet, row}`, όχι αριθμό.

Το `ok: true` είναι απαραίτητο — η `removeApplicantFromSheet` στο site πετάει
αν λείπει. Γυρίζει `ok: true` ακόμη και όταν δεν βρεθεί η γραμμή
(`{sheet: '', row: 0}`): μια γραμμή που καθαρίστηκε ήδη με το χέρι δεν είναι
αποτυχία, και δεν πρέπει να ξαναδοκιμάζει το cron κάθε βράδυ.

## Βήμα 3 — ενεργοποίηση

Αλλαγή στο `doPost` **δεν** ενεργοποιείται με σκέτο Save:

**Deploy → Manage deployments → ✏️ → Version: New version → Deploy**

Ποτέ «New deployment» — αλλάζει το `/exec` URL και σπάει το
`SHEET_WEBAPP_URL` στο Vercel.

---

## Δοκιμή

Η δοκιμή γίνεται από το site — δεν χρειάζεται να τρέξεις τίποτα στον editor.
Με email που δεν υπάρχει, η απάντηση ξεχωρίζει τις δύο περιπτώσεις:

| Απάντηση | Τι σημαίνει |
|---|---|
| `{"ok":true,"cleared":{"sheet":"Νέα Μέλη","row":0}}` | ✅ Βρήκε το μπλοκ, δεν βρήκε τη γραμμή — σωστό |
| `{"ok":false,...}` «Δεν βρέθηκε το μπλοκ» | ❌ Δεν εντοπίζει τα ΕΓΚΕΚΡΙΜΕΝΑ — ο τίτλος γράφεται αλλιώς |

Το **όνομα του φύλλου στην απάντηση** είναι η απόδειξη ότι η αναζήτηση έγινε
πραγματικά. Κενό όνομα με `ok:true` δεν πρέπει να εμφανίζεται πια — γι' αυτό
μπήκε το `throw`.
