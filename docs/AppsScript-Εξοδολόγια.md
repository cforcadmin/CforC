# Apps Script: αρχειοθέτηση εξοδολογίων

Προσθήκη στο **WebApp.gs** του «ΕΣΟΔΑ ΕΞΟΔΑ_2026».
Βάση: η έκδοση που σερβίρει σήμερα το `/exec` — `SCRIPT_VERSION = '2026-08-17a'`.

Τίποτα υπάρχον δεν αλλάζει· προστίθενται **μία γραμμή στον dispatcher**, **δύο
νέες συναρτήσεις** και **μία αλλαγή στο `SCRIPT_VERSION`** ώστε το `ping` να
επιβεβαιώνει ότι πέρασε το νέο deployment.

---

## 1. Ο αριθμός έκδοσης

```js
var SCRIPT_VERSION = '2026-09-21a';   // ήταν '2026-08-17a'
```

## 2. Μία γραμμή στον dispatcher

Μέσα στο `doPost`, δίπλα στα υπόλοιπα actions — π.χ. αμέσως μετά το
`appendExpense`:

```js
    } else if (body.action === 'archiveExpenseClaim') {
      out = archiveExpenseClaim_(body);
```

## 3. Οι δύο νέες συναρτήσεις

Στο τέλος του αρχείου:

```js
// ════════════════════════════════════════════════════════════════════
// ΕΞΟΔΟΛΟΓΙΑ — το PDF και τα παραστατικά του μέλους στον φάκελο του μήνα
// Παραστατικά → {έτος} → Έξοδα {έτος} → NN_Μήνας {έτος} → «Εξοδολόγια»
//
// Ο φάκελος του μήνα δημιουργείται αν λείπει (σε αντίθεση με το
// expenseMonthFolder_, που μόνο ψάχνει): ένα εξοδολόγιο μπορεί να φτάσει
// πριν μπει το πρώτο τιμολόγιο του μήνα.
// ════════════════════════════════════════════════════════════════════

/** Φάκελος μήνα στα ΕΞΟΔΑ, με δημιουργία ό,τι λείπει */
function expenseMonthFolderEnsure_(monthIdx, year) {
  var y = String(year);
  var root = DriveApp.getFolderById(PARASTATIKA_FOLDER_ID);
  var yearF = childFolder_(root, function (n) { return n.trim() === y; }, y);
  var exodaF = childFolder_(yearF,
    function (n) { return n.indexOf('ξοδα') !== -1 && n.indexOf(y) !== -1; },
    'Έξοδα ' + y);
  var prefix = ('0' + monthIdx).slice(-2) + '_';
  return childFolder_(exodaF,
    function (n) { return n.indexOf(prefix) === 0 && n.indexOf(y) !== -1; },
    prefix + MONTHS_PROPER[monthIdx - 1] + ' ' + y);
}

/**
 * body: { month 'yyyy-MM', claimNumber, pdfName, pdfBase64,
 *         attachments: [{ name, base64, mime }] }
 *
 * ΠΟΥ ΠΑΕΙ ΤΙ — και γιατί:
 *  · το ΕΞΟΔΟΛΟΓΙΟ (PDF) στον φάκελο ΤΟΥ ΜΗΝΑ, δίπλα στα τιμολόγια. Είναι
 *    το παραστατικό που αντιστοιχεί στη χρέωση της τράπεζας, και το
 *    listMonthInvoices_ διαβάζει ΜΟΝΟ τα αρχεία του φακέλου (όχι
 *    υποφακέλους). Έτσι μπαίνει μόνο του στη μηνιαία συμφωνία.
 *  · τα ΠΑΡΑΣΤΑΤΙΚΑ του μέλους (αποδείξεις, κάρτες επιβίβασης) στον
 *    υποφάκελο «Εξοδολόγια». Είναι τεκμηρίωση, όχι χρεώσεις — αν έμπαιναν
 *    στον φάκελο του μήνα, η συμφωνία θα ζητούσε να ταιριάξει κάθε ταξί
 *    με ξεχωριστή κίνηση τράπεζας.
 *
 * Idempotent: αν υπάρχει ήδη αρχείο με το ίδιο όνομα, δεν ξαναγράφεται.
 */
function archiveExpenseClaim_(b) {
  if (!/^\d{4}-\d{2}$/.test(String(b.month || ''))) return { ok: false, error: 'bad month' };
  if (!b.pdfBase64 || !b.pdfName) return { ok: false, error: 'missing pdf' };

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var parts = String(b.month).split('-');
    var monthF = expenseMonthFolderEnsure_(parseInt(parts[1], 10), parseInt(parts[0], 10));
    var claimsF = childFolder_(monthF,
      function (n) { return n.indexOf('ξοδολόγια') !== -1; },
      'Εξοδολόγια');

    function existing_(folder, name) {
      var it = folder.getFilesByName(name);
      return it.hasNext() ? it.next() : null;
    }

    // Το εξοδολόγιο: στον φάκελο του μήνα, για να το δει η συμφωνία
    var pdfFile = existing_(monthF, b.pdfName);
    if (!pdfFile) {
      pdfFile = monthF.createFile(
        Utilities.newBlob(Utilities.base64Decode(b.pdfBase64), 'application/pdf', b.pdfName));
    }

    // Τα παραστατικά: στον υποφάκελο, ως τεκμηρίωση
    var saved = [];
    var attachments = b.attachments || [];
    for (var i = 0; i < attachments.length; i++) {
      var a = attachments[i];
      if (!a || !a.base64 || !a.name) continue;
      var f = existing_(claimsF, a.name);
      if (!f) {
        f = claimsF.createFile(
          Utilities.newBlob(Utilities.base64Decode(a.base64), a.mime || 'application/octet-stream', a.name));
      }
      saved.push({ name: f.getName(), url: f.getUrl() });
    }

    return {
      ok: true,
      folderUrl: claimsF.getUrl(),
      folderId: claimsF.getId(),
      monthFolderUrl: monthF.getUrl(),
      pdfUrl: pdfFile.getUrl(),
      pdfId: pdfFile.getId(),
      files: saved,
    };
  } catch (err) {
    return { ok: false, error: String(err) };
  } finally {
    lock.releaseLock();
  }
}
```

## 4. Deploy

**Manage deployments → Edit → Version: New version → Deploy.** Χωρίς αυτό
τρέχει ο παλιός κώδικας — όπως λέει και το σχόλιο στην κορυφή του αρχείου.

## 5. Επαλήθευση

Το site στέλνει `ping` και περιμένει `version: '2026-09-21a'`. Αν δεν αλλάξει,
το deployment δεν πέρασε.

---

## Γιατί εδώ και όχι με Drive API

Ο λογαριασμός υπηρεσίας `cforc-oc@…` **δεν βλέπει** τους φακέλους των
Παραστατικών — δοκιμάστηκε και επιστρέφει `404 File not found`. Το script
τρέχει ως ιδιοκτήτης του Drive και ξέρει ήδη πού είναι ο φάκελος κάθε μήνα
(`monthFolder_`, `expenseMonthFolder_`). Το να ξαναγραφόταν αυτή η γνώση στο
site θα σήμαινε δύο αντίγραφα της ίδιας δομής φακέλων, που θα αποκλίνουν.


---

## Πώς φτάνει στο φύλλο ΕΞΟΔΑ

Δεν χρειάζεται τίποτα παραπάνω: το εξοδολόγιο μπαίνει στη **μηνιαία συμφωνία**
σαν κάθε άλλο παραστατικό.

1. Το PDF κάθεται στον φάκελο του μήνα, οπότε το `listMonthInvoices_` το
   επιστρέφει μαζί με τα τιμολόγια.
2. Ο parser διαβάζει από το όνομα: ημερομηνία, **πληρωτέο** και αριθμό
   (`ΕΞ-2026-001`). Το πληρωτέο είναι αυτό που θα βρεθεί στις χρεώσεις της
   τράπεζας — γι' αυτό μπαίνει στο όνομα, και μόνο όταν υπάρχει προκαταβολή
   γράφεται `σύνολο→πληρωτέο`.
3. Ο/η Financer εγκρίνει, και η γραμμή γράφεται στο ΕΞΟΔΑ με `appendExpense`.

**Την πρώτη φορά για κάθε μέλος** το μητρώο προμηθευτών δεν θα ξέρει το
`εξοδολογιο <όνομα>`, οπότε θα ζητηθεί κατηγορία — «Travel and Accommodation».
Από εκεί και πέρα τη θυμάται, όπως κάθε προμηθευτή.
