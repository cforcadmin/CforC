# Διαδραστικός Χάρτης Μελών - Changelog

Τεκμηρίωση όλων των αλλαγών που σχετίζονται με τον διαδραστικό χάρτη, τις ενημερώσεις στη σελίδα μελών, και τη σελίδα "Σχετικά με εμάς".

---

## 1. Νέα Σελίδα Χάρτη (`/map`)

### Επισκόπηση

Νέα πλήρης σελίδα με διαδραστικό χάρτη Ελλάδας που εμφανίζει τις τοποθεσίες όλων των μελών του CforC. Βασίζεται σε SVG choropleth με χρωματικές διαβαθμίσεις ανά περιφέρεια.

### Τεχνολογίες

| Πακέτο | Χρήση |
|--------|-------|
| `react-simple-maps` | ComposableMap, ZoomableGroup, Geographies, Geography, Marker |
| `d3-geo` | Projection utilities |
| GeoJSON (Eurostat NUTS2) | Γεωμετρία 13 περιφερειών Ελλάδας |

### Αρχεία

| Αρχείο | Περιγραφή |
|--------|-----------|
| `app/map/page.tsx` | Server component (metadata, SEO) |
| `app/map/MapPageClient.tsx` | Client component — κύρια σελίδα χάρτη |
| `components/map/GreeceMap.tsx` | SVG choropleth + ZoomableGroup με animated zoom |
| `components/map/ProvinceTooltip.tsx` | Tooltip ακολουθεί το ποντίκι πάνω από περιφέρειες |
| `components/map/CityMarkers.tsx` | Avatar clusters πόλεων (εμφανίζονται σε zoom) |
| `components/map/CityMemberPanel.tsx` | Πλαϊνό panel (desktop) / bottom sheet (mobile) με λίστα μελών |
| `components/map/EuropeInset.tsx` | Ένθετος χάρτης Ευρώπης για μέλη στο εξωτερικό |
| `components/map/MembersWithoutCity.tsx` | Αναδιπλούμενη λίστα μελών χωρίς πόλη |
| `components/map/MapLegend.tsx` | Υπόμνημα χρωματικής κλίμακας |
| `lib/mapData.ts` | NUTS→περιφέρεια mapping, συντεταγμένες πόλεων, κεντροειδή |
| `lib/mapUtils.ts` | Aggregation μελών, χρωματική κλίμακα, utilities |
| `public/geo/greece-provinces-nuts2.json` | GeoJSON 13 περιφερειών |
| `public/geo/europe-simple.json` | Απλοποιημένο GeoJSON 36 ευρωπαϊκών χωρών |
| `scripts/prepare-geojson.js` | Script λήψης/φιλτραρίσματος GeoJSON από Eurostat |

### Λειτουργίες Χάρτη Ελλάδας

| Λειτουργία | Περιγραφή |
|------------|-----------|
| **Choropleth** | 13 περιφέρειες χρωματισμένες κατά πυκνότητα μελών (5-βάθμια coral κλίμακα) |
| **Hover περιφέρειας** | Tooltip με όνομα, σύνολο μελών, κατανομή ανά πόλη |
| **Click περιφέρειας** | Animated zoom (cubic easing, 500ms) στην περιφέρεια |
| **City markers** | Avatar clusters με φωτογραφίες μελών (εμφανίζονται σε zoom > 2) |
| **Click πόλης** | Πλαϊνό panel (desktop) ή bottom sheet (mobile) με λίστα μελών |
| **Κουμπί "Πίσω"** | Επιστροφή στην αρχική εμφάνιση + hint πλήκτρου Esc |
| **Escape** | Zoom out στην αρχική εμφάνιση |
| **Dark mode** | Πλήρης υποστήριξη σκοτεινού θέματος |
| **URL params** | `?city=X` ή `?province=X` για deep linking από άλλες σελίδες |

### Υπόμνημα (MapLegend)

- 5-βάθμια χρωματική κλίμακα: 0, 1-2, 3-5, 6-15, 16+
- **Hover-to-expand**: Στο hover, η κάρτα γίνεται 2x μεγαλύτερη (CSS `transform: scale(2)`) προς τα δεξιά/κάτω
- Κείμενο "ΜΕΛΗ ΑΝΑ ΠΕΡΙΦΕΡΕΙΑ" σε μαύρο χρώμα
- Αριθμοί κλίμακας σε μαύρο χρώμα

### Ένθετος Χάρτης Ευρώπης (EuropeInset)

| Λειτουργία | Περιγραφή |
|------------|-----------|
| **36 χώρες** | Εμφανίζει όλες τις ευρωπαϊκές χώρες (όχι μόνο αυτές με μέλη) |
| **Drag/Pan** | ZoomableGroup για μετακίνηση στον χάρτη |
| **+/− Zoom** | Κουμπιά zoom με μαύρο outline (πάνω δεξιά) |
| **Hover-to-expand** | Διπλασιασμός μεγέθους (208→416px πλάτος) με CSS transition |
| **Header hover** | Dropdown λίστα μελών με avatar, όνομα, πόλη |
| **Κείμενο** | "ΜΕΛΗ ΣΤΟ ΕΞΩΤΕΡΙΚΟ" σε μαύρο, ονόματα πόλεων σε μαύρο |
| **Escape** | Κλείσιμο member list ή collapse expanded state (capture phase) |
| **Client-only rendering** | Αποφυγή hydration mismatch από floating-point transforms |
| **Desktop only** | Κρυφό σε mobile — εμφανίζονται ως text buttons |

### CityMemberPanel

| Πλατφόρμα | Εμφάνιση |
|-----------|----------|
| Desktop (lg+) | Πλαϊνό panel δεξιά, 400px πλάτος, σταθερή θέση |
| Tablet (md) | Bottom sheet, 60vh ύψος |
| Mobile (<md) | Full-screen modal |

Κάθε μέλος εμφανίζει: φωτογραφία, όνομα, πεδία πρακτικής, πόλη, link στο προφίλ.

### Μέλη Χωρίς Πόλη (MembersWithoutCity)

- Αναδιπλούμενη ενότητα κάτω από τον χάρτη
- Εμφανίζει avatar + όνομα σε grid
- Κείμενο ονομάτων σε `text-sm` (αυξημένο μέγεθος)

---

## 2. Ενημερώσεις Σελίδας Μελών (`/members`)

### Globe Icons στις Κάρτες Μελών (MemberFlipCard)

| Στοιχείο | Περιγραφή |
|----------|-----------|
| **Εμφάνιση** | Globe εικονίδιο (20px κύκλος, μαύρο border) εμφανίζεται στο hover δίπλα στο pill πόλης/περιφέρειας |
| **Link** | Πόλη → `/map?city=X`, Περιφέρεια → `/map?province=X` |
| **Tooltip** | "Δες στον χάρτη" εμφανίζεται αμέσως στο hover του globe |
| **Αρχείο** | `components/shared/MemberFlipCard.tsx` |

### Globe Icons στις Σελίδες Μελών (MemberDetailClient)

| Στοιχείο | Περιγραφή |
|----------|-----------|
| **Εμφάνιση** | Globe εικονίδιο (38px, μαύρο border) εμφανίζεται στο hover δίπλα στα pills τοποθεσίας |
| **Link** | Ίδια λογική με τις κάρτες — `/map?city=X` ή `/map?province=X` |
| **Tooltip** | "Δες στον χάρτη" |
| **Αρχείο** | `app/members/[name]/MemberDetailClient.tsx` |

### Persistent Search State (sessionStorage)

Η αναζήτηση/φίλτρα στη σελίδα μελών αποθηκεύονται στο `sessionStorage` και επαναφέρονται όταν ο χρήστης επιστρέψει.

| Κλειδί | `cforc-members-search` |
|--------|------------------------|
| **Αποθηκευόμενα** | searchQuery, selectedFields, selectedCities, selectedProvinces, sortMode, filterLogic, viewMode |
| **Προτεραιότητα** | URL params > sessionStorage > defaults |
| **Καθαρισμός** | Το "Καθαρισμός" διαγράφει και το sessionStorage |
| **Αρχείο** | `app/members/page.tsx` |

### Persistent Search — Νέα (`/news`)

| Κλειδί | `cforc-news-search` |
|--------|----------------------|
| **Αποθηκευόμενα** | searchQuery, activeTab, selectedYear |
| **Αρχείο** | `app/news/page.tsx` |

### Persistent Search — Ανοιχτές Προσκλήσεις (`/open-calls`)

| Κλειδί | `cforc-opencalls-search` |
|--------|--------------------------|
| **Αποθηκευόμενα** | searchQuery, activeTab, selectedYear |
| **Αρχείο** | `components/OpenCallsContent.tsx` |

### Persistent Profile Section (`/profile`)

| Κλειδί | `cforc-profile-section` |
|--------|-------------------------|
| **Αποθηκεύει** | Ενεργή ενότητα dashboard (π.χ. "profile", "settings") |
| **Αρχείο** | `app/profile/page.tsx` |

---

## 3. Ενημερώσεις Σελίδας "Σχετικά με εμάς" (`/about`)

### Αλλαγή Σειράς Ενοτήτων

| Πριν | Μετά |
|------|------|
| Hero | Hero |
| Χάρτης (static JPEG) | **ΛΙΓΑ ΛΟΓΙΑ (AboutTextSection)** |
| Βίντεο | **Προεπισκόπηση Χάρτη (AboutMapPreview)** |
| ΛΙΓΑ ΛΟΓΙΑ | Βίντεο |
| Πώς λειτουργούμε | Πώς λειτουργούμε |
| Τι προσφέρουμε | Τι προσφέρουμε |
| Βασικές αρχές | Βασικές αρχές |
| Στόχοι | Στόχοι |
| Συνεργάτες | Συνεργάτες |

### Νέο Component: AboutMapPreview

| Στοιχείο | Περιγραφή |
|----------|-----------|
| **Αντικαθιστά** | `AboutMapSection` (στατικός JPEG χάρτης με SVG circles) |
| **Εμφάνιση** | Εικόνα χάρτη Ελλάδας με κεντρικό CTA overlay |
| **CTA** | "ΕΞΕΡΕΥΝΗΣΕ ΤΟΝ ΧΑΡΤΗ" με pin εικονίδιο |
| **Υπότιτλος** | "Δες πού βρίσκονται τα μέλη μας σε όλη την Ελλάδα και το εξωτερικό" |
| **Link** | Ολόκληρη η κάρτα → `/map` |
| **Hover** | Overlay σκουραίνει, CTA card κάνει scale up (1.05x) |
| **Animation** | Fade-in + slide-up κατά το scroll (IntersectionObserver) |
| **Αρχείο** | `components/AboutMapPreview.tsx` |

### Ενημέρωση Βίντεο (AboutVideoSection)

| Πριν | Μετά |
|------|------|
| `bg-black/40` overlay — κρύβει εντελώς το thumbnail | `bg-black/15` overlay — φαίνεται το thumbnail |
| `bg-black/30` play button | `bg-white/30 backdrop-blur-sm` (frosted glass) |
| Χωρίς preload | `preload="metadata"` + `src="#t=0.5"` φορτώνει frame στο 0.5s |
| Στατικό hover | `hover:bg-black/25` transition στο overlay |

**Αρχείο:** `components/AboutVideoSection.tsx`

---

## 4. Navigation & Footer

### Navigation (`components/Navigation.tsx`)

| Αλλαγή | Περιγραφή |
|--------|-----------|
| **Νέο link** | "ΧΑΡΤΗΣ" (`/map`) στο navigation bar |
| **Σειρά (μη συνδεδεμένος)** | ΑΡΧΙΚΗ → ΤΟ ΔΙΚΤΥΟ → ΜΕΛΗ → ΝΕΑ → **ΧΑΡΤΗΣ** → ΣΥΜΜΕΤΟΧΗ → ΕΠΙΚΟΙΝΩΝΙΑ |
| **Σειρά (συνδεδεμένος)** | ΑΡΧΙΚΗ → ΤΟ ΔΙΚΤΥΟ → ΜΕΛΗ → ΝΕΑ → ΕΡΓΑ → **ΧΑΡΤΗΣ** → ΕΠΙΚΟΙΝΩΝΙΑ |
| **Compact spacing** | `space-x-4` πάντα (και για μη συνδεδεμένους — ταίριασμα με compact logged-in version) |

### Footer (`components/Footer.tsx`)

- "Χάρτης" link προστέθηκε στο sitemap, αμέσως μετά το "Νέα"

---

## 5. Τεχνικές Σημειώσεις

### Hydration Fixes

| Πρόβλημα | Λύση |
|----------|------|
| `react-simple-maps` markers παράγουν floating-point `transform` attributes διαφορετικά σε server/client | Client-only rendering (`mounted` state via `useEffect`) στο EuropeInset |
| Google Translate widget εισάγει `role`/`tabindex` πριν το hydration | `suppressHydrationWarning` στο LanguageSwitcher container |
| Nested `<button>` σε `<button>` (CategoryFilter, YearFilter) | Αντικατάσταση εσωτερικού `<button>` με `<span role="button" tabIndex={0}>` |

### Peer Dependency Fix

| Πρόβλημα | Λύση |
|----------|------|
| `react-simple-maps@3.0.0` απαιτεί `react@^16.8.0 \|\| 17.x \|\| 18.x` αλλά το project χρησιμοποιεί React 19 | `.npmrc` με `legacy-peer-deps=true` |

### Year Persistence Bug Fix

| Πρόβλημα | Αιτία | Λύση |
|----------|-------|------|
| Το φίλτρο έτους δεν αποθηκευόταν σωστά | React effects τρέχουν κατά σειρά δήλωσης — restore effect + reset effect δημιουργούσαν race condition | Αντικατάσταση effect-based reset με `handleTabChange` callback |

---

## 6. Sitemap

Το αρχείο `app/sitemap.ts` ενημερώθηκε να περιλαμβάνει `/map`.
