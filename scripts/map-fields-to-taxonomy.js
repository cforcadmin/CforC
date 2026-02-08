const fs = require('fs');
const path = require('path');

// ============================================================
// Taxonomy mapping script
// Maps free-text "New FieldsOfWork" entries to structured taxonomy
// ============================================================

// --- Splittable subcategory groups ---
// When multiple entries map to options in the same splittable group,
// they get combined as "Option1 / Option2" (counts as ONE entry).
const SPLITTABLE_GROUPS = {
  'theatre_dance_performing': {
    label: 'Θέατρο / Χορός / Performing Arts',
    options: ['Θέατρο', 'Χορός', 'Performing Arts'],
  },
  'cinema_doc': {
    label: 'Κινηματογράφος / Ντοκιμαντέρ',
    options: ['Κινηματογράφος', 'Ντοκιμαντέρ'],
  },
  'literature': {
    label: 'Λογοτεχνία / Ποίηση / Συγγραφή',
    options: ['Λογοτεχνία', 'Ποίηση', 'Συγγραφή'],
  },
  'digital_arts': {
    label: 'Ψηφιακές Τέχνες / Game Dev / Media / AI art',
    options: ['Ψηφιακές Τέχνες', 'Game Dev', 'Media', 'AI art'],
  },
  'museums': {
    label: 'Μουσεία / Μουσειολογία',
    options: ['Μουσεία', 'Μουσειολογία'],
  },
  'advocacy': {
    label: 'Συνηγορία / Commons / Artivism',
    options: ['Συνηγορία', 'Commons', 'Artivism'],
  },
  'youth': {
    label: 'Νεολαία / Διαγενεακά',
    options: ['Νεολαία', 'Διαγενεακά'],
  },
};

// Reverse lookup: option -> group key
const OPTION_TO_GROUP = {};
for (const [groupKey, group] of Object.entries(SPLITTABLE_GROUPS)) {
  for (const opt of group.options) {
    OPTION_TO_GROUP[opt] = groupKey;
  }
}

// --- Mapping: lowercase free-text -> taxonomy value ---
// For splittable options, the value is the option name (e.g. "Θέατρο")
// For non-splittable, it's the full taxonomy label
const MAPPING = {
  // Education & Learning
  'εκπαίδευση': 'Εκπαίδευση & Μάθηση',
  'μη τυπική εκπαίδευση': 'Μη Τυπική Εκπαίδευση',
  'τυπική εκπαίδευση': 'Τυπική Εκπαίδευση',
  'διά βίου μάθηση': 'Διά Βίου Μάθηση',
  'επαγγελματικός προσανατολισμός': 'Επαγγελματικός Προσανατολισμός',
  'παιδαγωγική': 'Μη Τυπική Εκπαίδευση',
  'δασικό σχολείο': 'Μη Τυπική Εκπαίδευση',
  'πολιτιστική εκπαίδευση': 'Εκπαίδευση & Μάθηση',
  'εργαστήρια': 'Μη Τυπική Εκπαίδευση',

  // Cultural Management & Communication
  'πολιτιστική διαχείριση': 'Πολιτιστική Διαχείριση & Επικοινωνία',
  'διαχείριση': 'Πολιτιστική Διαχείριση & Επικοινωνία',
  'παραγωγή': 'Παραγωγή & Οργάνωση',
  'οργάνωση παραγωγής': 'Παραγωγή & Οργάνωση',
  'παραγωγή & οργάνωση': 'Παραγωγή & Οργάνωση',
  'διαχείριση έργου': 'Παραγωγή & Οργάνωση',
  'διαχείριση παραγωγής': 'Παραγωγή & Οργάνωση',
  'διαχείριση περιοδείας': 'Παραγωγή & Οργάνωση',
  'δημιουργική παραγωγή': 'Παραγωγή & Οργάνωση',
  'επιμέλεια εκθέσεων': 'Επιμέλεια Εκθέσεων',
  'eπιμέλεια εκθέσεων': 'Επιμέλεια Εκθέσεων', // with Latin E
  'χρηματοδότηση': 'Χρηματοδοτήσεις / Εύρεση Πόρων',
  'εξεύρεση πόρων': 'Χρηματοδοτήσεις / Εύρεση Πόρων',
  'συγγραφή προτάσεων χρηματοδότησης': 'Χρηματοδοτήσεις / Εύρεση Πόρων',
  'πολιτιστική επικοινωνία': 'Πολιτιστική Επικοινωνία',
  'φεστιβάλ': 'Παραγωγή & Οργάνωση',
  'πολιτιστικό μάρκετινγκ': 'Πολιτιστική Επικοινωνία',
  'διαχείριση προγραμμάτων': 'Παραγωγή & Οργάνωση',

  // Arts & Culture
  'εικαστικά': 'Εικαστικά / Visual Arts',
  'εικαστικές τέχνες': 'Εικαστικά / Visual Arts',
  'σύγχρονη τέχνη': 'Εικαστικά / Visual Arts',
  'ιστορία της τέχνης': 'Εικαστικά / Visual Arts',
  'μουσική': 'Μουσική / Ήχος',
  'θέατρο': 'Θέατρο', // splittable
  'φυσικό θέατρο': 'Θέατρο', // splittable
  'χορός': 'Χορός', // splittable
  'συμπεριληπτικός χορός': 'Χορός', // splittable (maps to Χορός)
  'παραστατικές τέχνες': 'Performing Arts', // splittable
  'παράσταση': 'Performing Arts', // splittable
  'τσίρκο': 'Performing Arts', // splittable
  'κινηματογράφος': 'Κινηματογράφος', // splittable
  'σκηνοθεσία': 'Κινηματογράφος', // splittable
  'μοντάζ': 'Κινηματογράφος', // splittable
  'παραγωγή οπτικοακουστικών έργων': 'Κινηματογράφος', // splittable
  'ντοκιμαντέρ': 'Ντοκιμαντέρ', // splittable
  'λογοτεχνία': 'Λογοτεχνία', // splittable
  'ποίηση': 'Ποίηση', // splittable
  'γραφή': 'Συγγραφή', // splittable
  'συγγραφή': 'Συγγραφή', // splittable
  'ψηφιακές τέχνες': 'Ψηφιακές Τέχνες', // splittable
  'σχεδιασμός εμπειριών': 'Ψηφιακές Τέχνες', // splittable
  'ανάπτυξη παιχνιδιών': 'Game Dev', // splittable
  'παιχνίδια': 'Game Dev', // splittable
  'μέσα ενημέρωσης': 'Media', // splittable
  'βίντεο': 'Media', // splittable
  'τεχνητή νοημοσύνη': 'AI art', // splittable
  'μουσεία': 'Μουσεία', // splittable
  'μουσειολογία': 'Μουσειολογία', // splittable
  'φωτογραφία': 'Φωτογραφία',
  'ψηφιακός πολιτισμός': 'Ψηφιακός Πολιτισμός',
  'πολιτισμός': 'Τέχνες & Πολιτισμός', // general category

  // Health
  'υγεία-ευεξία': 'Υγεία',
  'υγεία': 'Υγεία',
  'ψυχική υγεία': 'Ψυχική Υγεία',
  'ψυχοθεραπεία': 'Θεραπευτικές Πρακτικές',
  'χοροθεραπεία': 'Θεραπευτικές Πρακτικές',
  'θεραπευτική φωτογραφία': 'Θεραπευτικές Πρακτικές',
  'τέχνη-θεραπεία': 'Θεραπευτικές Πρακτικές',
  'αυτοβελτίωση': 'Αυτοβελτίωση',

  // Humanities & Social Sciences
  'έρευνα': 'Έρευνα',
  'έρευνα-μελέτη': 'Έρευνα',
  'εργασιακή έρευνα': 'Έρευνα',
  'πολιτιστική πολιτική': 'Πολιτιστική Πολιτική',
  'politistiki-politiki': 'Πολιτιστική Πολιτική',
  'ανάπτυξη πολιτικών': 'Ανάπτυξη Πολιτικών',
  'ανάπτυξη πολιτικών σε τοπικό-εθνικό-πανευρωπαϊκό-παγκόσμιο επίπεδο': 'Ανάπτυξη Πολιτικών',

  // Inclusion / Accessibility
  'προσβασιμότητα': 'Συμπερίληψη / Προσβασιμότητα',
  'συμπερίληψη': 'Συμπερίληψη / Προσβασιμότητα',
  'διαφορετικότητα': 'Συμπερίληψη / Προσβασιμότητα',
  'ειδική αγωγή': 'Εκπαιδευτικά Εργαλεία για Συμπερίληψη',
  'συμπεριληπτικός σχεδιασμός': 'Συμπεριληπτικός Σχεδιασμός / Universal Design',

  // Environment & Sustainability
  'περιβάλλον': 'Περιβάλλον & Βιωσιμότητα',
  'προστασία του περιβάλλοντος': 'Περιβάλλον & Βιωσιμότητα',
  'κλιματική αλλαγή': 'Κλιματική Αλλαγή',
  'βιωσιμότητα': 'Βιώσιμη Ανάπτυξη',
  'βιώσιμη ανάπτυξη': 'Βιώσιμη Ανάπτυξη',
  'κυκλική οικονομία': 'Βιώσιμη Ανάπτυξη',
  'μηδενικά απόβλητα': 'Βιώσιμη Ανάπτυξη',
  'μπλε οικονομία': 'Βιώσιμη Ανάπτυξη',
  'περιβαλλοντική εκπαίδευση': 'Περιβάλλον & Βιωσιμότητα',

  // Civic Engagement
  'συμμετοχή στα κοινά': 'Ενεργός Πολιτειότητα (Civic Engagement)',
  'κοινοτικές τέχνες': 'Κοινοτική Τέχνη / Community Arts',
  'κοινοτικές πρακτικές': 'Κοινοτική Τέχνη / Community Arts',
  'κοινωνικά εμπλεκόμενες τέχνες': 'Κοινοτική Τέχνη / Community Arts',
  'κοινοτικά έργα': 'Κοινοτική Τέχνη / Community Arts',
  'κοινοτική δέσμευση': 'Κοινοτική Τέχνη / Community Arts',
  'συμμετοχικές πρακτικές': 'Συμμετοχικές Πρακτικές',
  'συμμετοχικός σχεδιασμός': 'Συμμετοχικές Πρακτικές',
  'ενεργή συμμετοχή πολιτών': 'Συμμετοχικές Πρακτικές',
  'συνηγορία': 'Συνηγορία', // splittable
  'συνηγορία για χάραξη νέων πολιτικών': 'Συνηγορία', // splittable
  'αρτιβισμός': 'Artivism', // splittable
  'κοινά': 'Commons', // splittable
  'αυτοδιαχείριση': 'Commons', // splittable
  'τοπική αυτοδιοίκηση': 'Τοπική Αυτοδιοίκηση',
  'διαγενεακά': 'Διαγενεακά', // splittable
  'ανταλλαγές νέων': 'Νεολαία', // splittable
  'νεανικές τέχνες': 'Νεολαία', // splittable
  'πολιτική': 'Ενεργός Πολιτειότητα (Civic Engagement)',
  'δέσμευση': 'Ενεργός Πολιτειότητα (Civic Engagement)',

  // Architecture & Spatial Practices
  'αρχιτεκτονική': 'Αρχιτεκτονική',
  'δημιουργία χώρου': 'Placemaking',
  'χαρτογράφηση': 'Χαρτογράφηση',
  'πολιτιστική κληρονομιά': 'Πολιτιστική Κληρονομιά',
  'αρχαιολογία': 'Αρχαιολογία',

  // Entrepreneurship / Innovation
  'κοινωνική επιχειρηματικότητα': 'Κοινωνική Επιχειρηματικότητα',
  'kοινωνική επιχειρηματικότητα': 'Κοινωνική Επιχειρηματικότητα', // with Latin K
  'πολιτιστική επιχειρηματικότητα': 'Πολιτιστική Επιχειρηματικότητα',
  'κοινωνική καινοτομία': 'Κοινωνική Επιχειρηματικότητα',
  'πολιτιστικός τουρισμός': 'Πολιτιστική Επιχειρηματικότητα',
  'τουρισμός': 'Πολιτιστική Επιχειρηματικότητα',
  'δημιουργικός τουρισμός': 'Πολιτιστική Επιχειρηματικότητα',

  // Research / cross-sector (misc mappings)
  'προφορική ιστορία': 'Έρευνα',
  'διαπολιτισμικός διάλογος': 'Συμπερίληψη / Προσβασιμότητα',
  'καρναβάλι': 'Παραγωγή & Οργάνωση',
  'έμφυλο': 'Συμπερίληψη / Προσβασιμότητα',

  // Additional mappings for previously unmapped entries
  'συναντήσεις-συνέδρια': 'Παραγωγή & Οργάνωση',
  'συνέδρια': 'Παραγωγή & Οργάνωση',
  'διαλέξεις': 'Μη Τυπική Εκπαίδευση',
  'παρουσιάσεις': 'Μη Τυπική Εκπαίδευση',
  'διευκόλυνση': 'Συμμετοχικές Πρακτικές', // facilitation = participatory practices
  'οργανωτική ανάπτυξη': 'Πολιτιστική Διαχείριση & Επικοινωνία',
  'σχεδιασμός υπηρεσιών': 'Παραγωγή & Οργάνωση',
  'ανάπτυξη δυνατοτήτων': 'Εκπαίδευση & Μάθηση', // capacity building = education
  'σχεδιασμός': 'Παραγωγή & Οργάνωση',
  'διατομεακή σύνδεση πολιτισμού με ανθρωπιστικές επιστήμες': 'Έρευνα',
  'διατομεακή σύνδεση πολιτισμού με τεχνολογικές επιστήμες': 'Έρευνα',
  'διατομεακή σύνδεση πολιτισμού με θετικές επιστήμες': 'Έρευνα',
  'μετάφραση': 'Πολιτιστική Επικοινωνία',
  'δημιουργία hub': 'Κοινοτική Τέχνη / Community Arts', // hub creation = community arts
  'κοινωνικός αντίκτυπος': 'Κοινωνική Επιχειρηματικότητα',
  'εμπειρίες': 'Μη Τυπική Εκπαίδευση', // experiences/workshops
  'καθοδήγηση καλλιτεχνών': 'Μη Τυπική Εκπαίδευση', // artist mentoring
  'δικτύωση': 'Πολιτιστική Διαχείριση & Επικοινωνία',
  'πολιτισμός και ανάπτυξη': 'Πολιτιστική Πολιτική',
  'πολιτιστική συμμετοχή': 'Συμμετοχικές Πρακτικές',
  'πόλεις': 'Placemaking', // urban engagement
  'αστικές κοινότητες': 'Κοινοτική Τέχνη / Community Arts',
  'αστική κουλτούρα': 'Placemaking',
  'εκστρατείες ευαισθητοποίησης': 'Πολιτιστική Επικοινωνία',
  'εκστρατείες': 'Πολιτιστική Επικοινωνία',
  'μάρκετινγκ κοινωνικού αντικτύπου': 'Πολιτιστική Επικοινωνία',
  'εθνικά και διεθνή προγράμματα': 'Παραγωγή & Οργάνωση',
  'χακαθόν': 'Συμμετοχικές Πρακτικές',
  'δημιουργία και διαχείριση περιεχομένου': 'Πολιτιστική Επικοινωνία',
  'κοινωνικό μάρκετινγκ': 'Πολιτιστική Επικοινωνία',
  'οπτικός σχεδιασμός': 'Εικαστικά / Visual Arts',
  'διαχείριση δικτύου': 'Πολιτιστική Διαχείριση & Επικοινωνία',
  'ανάπτυξη μεθοδολογίας': 'Έρευνα',
  'χειροτεχνία': 'Εικαστικά / Visual Arts',
  'επιμέλεια περιεχομένου': 'Πολιτιστική Επικοινωνία',
  'εκθέσεις': 'Επιμέλεια Εκθέσεων',
};

// Entries to skip entirely (locations, placeholders, etc.)
const SKIP_ENTRIES = new Set([
  'κύπρος', 'αχαΐα', 'αθήνα', 'θεσσαλονίκη', 'ηράκλειο', 'κρήτη',
  'βόλος', 'λέσβος', 'μύκονος', 'σύρος', 'σκόπελος', 'χίος',
  'πάτρα', 'καλαμάτα', 'πρέβεζα', 'αλεξανδρούπολη', 'μεσολόγγι',
  'λισαβόνα', 'ζυρίχη', 'λινζ', 'στοκχόλμη', 'καλαμπάκα',
  'κρήτη-ηράκλειο', 'πρoς συμπλήρωση', 'προς συμπλήρωση',
]);

// Entries to keep as custom (verbatim)
const CUSTOM_ENTRIES = new Set([
  'διοίκηση cforc',
]);

// Check if an entry is a location or placeholder to skip
function shouldSkip(entry) {
  const lower = entry.toLowerCase().trim();
  if (SKIP_ENTRIES.has(lower)) return true;
  if (lower.includes('συμπλήρωση') || lower.includes('συμπληρωση')) return true;
  // Also match the exact mixed-case variant
  if (entry.trim().startsWith('ΠΡος')) return true;
  return false;
}

// Check if an entry is a custom keep-as-is entry
function isCustom(entry) {
  return CUSTOM_ENTRIES.has(entry.toLowerCase().trim());
}

function mapFieldsForRow(fieldsStr) {
  if (!fieldsStr || fieldsStr.trim() === '' || fieldsStr.trim() === '-') {
    return '';
  }

  // Split by comma
  const rawEntries = fieldsStr.split(',').map(e => e.trim()).filter(e => e.length > 0);

  // Track mapped taxonomy values and splittable group selections
  const taxonomyValues = []; // non-splittable results
  const splittableSelections = {}; // groupKey -> Set of selected options
  const customValues = []; // kept as-is
  const unmapped = []; // could not map

  for (const raw of rawEntries) {
    const lower = raw.toLowerCase().trim();

    // Skip locations and placeholders
    if (shouldSkip(raw)) continue;

    // Keep custom entries as-is
    if (isCustom(raw)) {
      customValues.push(raw.trim());
      continue;
    }

    // Check if it's "ΠΡος συμπλήρωση"
    if (lower.startsWith('προς συμπλ') || lower === 'προς συμπλήρωση') continue;

    // Try to map
    const mapped = MAPPING[lower];
    if (mapped) {
      // Check if mapped value is a splittable option
      if (OPTION_TO_GROUP[mapped]) {
        const groupKey = OPTION_TO_GROUP[mapped];
        if (!splittableSelections[groupKey]) {
          splittableSelections[groupKey] = new Set();
        }
        splittableSelections[groupKey].add(mapped);
      } else {
        // Regular taxonomy value
        if (!taxonomyValues.includes(mapped)) {
          taxonomyValues.push(mapped);
        }
      }
    } else {
      // Unmapped - keep as custom
      unmapped.push(raw.trim());
    }
  }

  // Build splittable combined entries
  const splittableEntries = [];
  for (const [groupKey, selectedSet] of Object.entries(splittableSelections)) {
    const group = SPLITTABLE_GROUPS[groupKey];
    // Filter to only selected options, in canonical order
    const selected = group.options.filter(opt => selectedSet.has(opt));
    if (selected.length > 0) {
      splittableEntries.push(selected.join(' / '));
    }
  }

  // Combine all: taxonomy values + splittable entries + custom + unmapped
  let allEntries = [...taxonomyValues, ...splittableEntries, ...customValues, ...unmapped];

  // Deduplicate
  const seen = new Set();
  allEntries = allEntries.filter(e => {
    const key = e.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Limit to max 5
  if (allEntries.length > 5) {
    console.log(`  ⚠ Trimming from ${allEntries.length} to 5 entries. Dropped: ${allEntries.slice(5).join(', ')}`);
    allEntries = allEntries.slice(0, 5);
  }

  return allEntries.join(', ');
}

// ============================================================
// Main
// ============================================================

const csvPath = path.resolve(__dirname, '..', 'fields-of-work-cleanup-report-2026-02-08.csv');
const outputPath = csvPath; // overwrite same file

console.log('Reading CSV:', csvPath);
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n');

console.log(`Found ${lines.length} lines (including header)\n`);

const header = lines[0];
const dataLines = lines.slice(1).filter(l => l.trim().length > 0);

const outputLines = [header];

for (const line of dataLines) {
  // Parse semicolon-separated values
  const cols = line.split(';');

  const name = cols[2] || '';
  const newFieldsOfWork = cols[8] || '';

  console.log(`--- ${name.trim()} ---`);
  console.log(`  Input:  ${newFieldsOfWork}`);

  const mapped = mapFieldsForRow(newFieldsOfWork);

  console.log(`  Output: ${mapped}`);
  console.log('');

  // Set column 9 (New FieldsOfWork NEW DESIGN)
  // Ensure we have at least 10 columns
  while (cols.length < 10) {
    cols.push('');
  }
  cols[9] = mapped;

  outputLines.push(cols.join(';'));
}

// Write output
const outputContent = outputLines.join('\n');
fs.writeFileSync(outputPath, outputContent, 'utf-8');
console.log(`\n✅ Done! Updated CSV saved to: ${outputPath}`);
console.log(`   Processed ${dataLines.length} members.`);
