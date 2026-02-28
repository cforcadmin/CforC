// Educational Material Data
// Hardcoded resource library for CforC members

export interface Resource {
  title: string
  engTitle?: string
  description: string
  engDescription?: string
  url: string
}

export interface Subcategory {
  key: string
  name: string           // short name for bubble
  fullName: string       // full name for header
  description: string    // tooltip text (Greek)
  engDescription?: string
  externalUrl?: string   // if set, click opens this URL instead of resources view
  resources: Resource[]  // empty for Εκπαιδεύσεις (they use externalUrl)
}

export interface Category {
  key: string
  name: string
  engName?: string
  description: string
  engDescription?: string
  icon: string
  subcategories: Subcategory[]
}

export const educationalCategories: Category[] = [
  // ──────────────────────────────────────────────
  // 1. ΕΡΓΑΛΕΙΑ (ΜΕΡΟΣ Α)
  // ──────────────────────────────────────────────
  {
    key: 'tools',
    name: 'Εργαλεία',
    engName: 'Tools & Toolkits',
    description: 'Πρακτικά εργαλεία, οδηγοί και εργαλειοθήκες για πολιτιστικούς οργανισμούς και επαγγελματίες.',
    engDescription: 'Practical tools, guides, and toolkits for cultural organisations and professionals.',
    icon: '🛠️',
    subcategories: [
      {
        key: 'social-impact',
        name: 'Κοιν. Αντίκτυπος',
        fullName: 'Κοινωνικός Αντίκτυπος',
        description: 'Εργαλεία μέτρησης και αξιολόγησης κοινωνικού αντίκτυπου πολιτιστικών δράσεων.',
        engDescription: 'Tools for measuring and evaluating the social impact of cultural activities.',
        resources: [
          {
            title: 'Culture for Change — Εργαλειοθήκη Κοινωνικού Αντίκτυπου',
            engTitle: 'Culture for Change — Social Impact Toolkit',
            description: 'Η εργαλειοθήκη του δικτύου CForC για τη μέτρηση και αξιολόγηση του κοινωνικού αντίκτυπου πολιτιστικών δράσεων.',
            engDescription: 'CForC\'s own toolkit for measuring and evaluating the social impact of cultural activities.',
            url: 'https://drive.google.com/drive/folders/1fnotszYYc1NrXxIRTzD7XeVP5u9Cz2yM?usp=sharing',
          },
          {
            title: 'Arts Council England — Social Impact Framework',
            description: 'Προσεγγίσεις για τη μέτρηση του κοινωνικού αντίκτυπου επενδύσεων στη δημιουργικότητα και τον πολιτισμό.',
            engDescription: 'Approaches to measuring the social impact of investment in creativity and culture.',
            url: 'https://www.artscouncil.org.uk/research-and-data/social-impact-framework',
          },
          {
            title: 'Americans for the Arts — Animating Democracy',
            engTitle: 'Americans for the Arts — Measuring Social Impact of the Arts',
            description: 'Εργαλεία αξιολόγησης, δείκτες αλλαγής και μελέτες περίπτωσης για κοινωνική αλλαγή μέσω τεχνών.',
            engDescription: 'Evaluation tools, indicators of change, and case studies for arts-based social change work.',
            url: 'https://www.americansforthearts.org/by-topic/social-change/how-can-we-measure-and-understand-the-social-impact-of-the-arts',
          },
        ],
      },
      {
        key: 'evaluation',
        name: 'Αξιολόγηση',
        fullName: 'Αξιολόγηση & Αυτοαξιολόγηση',
        description: 'Οδηγοί αξιολόγησης και αυτοαξιολόγησης για πολιτιστικά projects.',
        engDescription: 'Evaluation and self-assessment guides for cultural projects.',
        resources: [
          {
            title: 'ENCC — The Evaluation Journey',
            engTitle: 'ENCC — The Evaluation Journey: A Toolkit for Cultural Operators',
            description: 'Βήμα-βήμα οδηγός αξιολόγησης για πολιτιστικά projects.',
            engDescription: 'Step-by-step guide through the evaluation process for cultural projects.',
            url: 'https://encc.eu/articles/the-evaluation-journey-a-toolkit-for-cultural-operators',
          },
          {
            title: 'ENCC — Environmental Sustainability Self-Assessment',
            description: 'Εργαλείο αυτοαξιολόγησης περιβαλλοντικής βιωσιμότητας για πολιτιστικούς οργανισμούς.',
            engDescription: 'Self-assessment tool for cultural organisations to evaluate environmental sustainability practices.',
            url: 'https://encc.eu/articles/environmental-sustainability-self-assessment-tool',
          },
        ],
      },
      {
        key: 'digital-ethics',
        name: 'Ψηφιακή Ηθική & AI',
        fullName: 'Ψηφιακή Ηθική & AI',
        description: 'Εργαλεία ψηφιακής ηθικής και κριτικής προσέγγισης της τεχνητής νοημοσύνης.',
        engDescription: 'Digital ethics tools and critical approaches to AI for cultural organisations.',
        resources: [
          {
            title: 'ENCC — On Digital Ethics for Cultural Organisations',
            description: 'Εργαλειοθήκη με αναστοχασμούς, πρακτική έρευνα και παραδείγματα ηθικών ψηφιακών επιλογών.',
            engDescription: 'Toolkit with reflections, practical research, and examples for navigating ethical digital choices.',
            url: 'https://encc.eu/articles/on-digital-ethics-for-cultural-organisations',
          },
          {
            title: 'ENCC — The Artificial Enthusiasm Reading List',
            description: 'Επιμελημένη, πολυοπτική συλλογή για κριτική εμβάθυνση στην AI.',
            engDescription: 'Curated, multi-perspective collection for a critical deep dive into AI.',
            url: 'https://encc.eu/articles/the-artificial-enthusiasm-reading-list',
          },
        ],
      },
      {
        key: 'sustainability',
        name: 'Βιωσιμότητα',
        fullName: 'Βιωσιμότητα & Πράσινη Μετάβαση',
        description: 'Οικο-οδηγοί, πρότυπα και πρακτικές βιωσιμότητας για πολιτιστικά δίκτυα.',
        engDescription: 'Eco-guidelines, templates, and sustainability practices for cultural networks.',
        resources: [
          {
            title: 'SHIFT Culture — Eco-Guidelines for Cultural Networks',
            description: 'Εξειδικευμένοι οικο-οδηγοί και πρότυπα για δίκτυα που επιδιώκουν βιωσιμότητα.',
            engDescription: 'Tailor-made eco-guidelines and templates for network organisations pursuing sustainability.',
            url: 'https://shift-culture.eu/achieve-environmental-sustainability-in-your-work/shift-eco-guidelines-for-networks/',
          },
          {
            title: 'SHIFT Culture — Eco-Guidelines Templates',
            description: 'Έτοιμα πρότυπα: σχέδια δράσης βιωσιμότητας, παρακολούθηση ταξιδιών, ρήτρες βιωσιμότητας εκδηλώσεων.',
            engDescription: 'Ready-to-use templates: sustainability action plans, travel tracking, event sustainability clauses.',
            url: 'https://shift-culture.eu/achieve-environmental-sustainability-in-your-work/shift-eco-guidelines-for-networks/eco-guidelines-templates/',
          },
          {
            title: 'Trans Europe Halles — Cultural Centers as Agents of Transition',
            description: 'Πρακτικός οδικός χάρτης για πολιτιστικούς χώρους που επανεξετάζουν τον ρόλο τους στη βιώσιμη μετάβαση.',
            engDescription: 'Practical roadmap for cultural spaces reimagining their role in sustainable transformation.',
            url: 'https://www.teh.net/resources/cultural-centers-as-agents-of-transition/',
          },
        ],
      },
      {
        key: 'inclusion',
        name: 'Ένταξη',
        fullName: 'Ένταξη & Προσβασιμότητα',
        description: 'Πόροι για την ένταξη ατόμων με αναπηρία στην τέχνη και την εκπαίδευση.',
        engDescription: 'Resources on inclusion of disabled people in arts education and practice.',
        resources: [
          {
            title: 'ENCC — Tools on Inclusion in Art and Arts Education',
            description: 'Πόροι για τα εμπόδια πρόσβασης ατόμων με αναπηρία στις τέχνες.',
            engDescription: 'Resources addressing obstacles preventing disabled people from accessing arts education and practice.',
            url: 'https://encc.eu/articles/tools-on-inclusion-in-art-and-arts-education',
          },
          {
            title: 'On the Move — Mobility of Disabled Artists',
            engTitle: 'On the Move — International Mobility of Disabled Artists and Culture Professionals',
            description: 'Συστάσεις για προσβάσιμη κινητικότητα πολιτιστικών επαγγελματιών.',
            engDescription: 'Publication with recommendations for all cultural stakeholders on accessible mobility.',
            url: 'https://on-the-move.org/resources/library/cultural-mobility-flows-international-mobility-disabled-artists-and-culture',
          },
        ],
      },
      {
        key: 'networking',
        name: 'Δικτύωση',
        fullName: 'Δικτύωση & Τοπικές Συνεργασίες',
        description: 'Οδηγοί για τοπική δικτύωση και συνεργασίες πολιτιστικών οργανισμών.',
        engDescription: 'Guides for local networking and collaborations between cultural organisations.',
        resources: [
          {
            title: 'ENCC — Local Networks Guide',
            engTitle: 'ENCC — Local Networks: A Guide to Reimagining the Work of Cultural Organisations',
            description: 'Οδηγός για πολιτιστικούς οργανισμούς που θέλουν να ενώσουν δυνάμεις τοπικά.',
            engDescription: 'Guide for cultural organisations seeking to join forces and share resources locally.',
            url: 'https://encc.eu/articles/local-networks-a-guide-to-reimagining-the-work-of-cultural-organisations',
          },
          {
            title: 'ENCC — Cultural Centre Challenges Toolkit',
            description: 'Εργαλειοθήκη για κοινές προκλήσεις κοινωνικο-πολιτιστικών εργαζομένων στην Ευρώπη.',
            engDescription: 'Toolkit on common challenges facing socio-cultural workers across Europe.',
            url: 'https://encc.eu/articles/cultural-centre-challenges-a-toolkit-from-the-second-visions-for-the-future-brainstorm',
          },
          {
            title: 'Tools for Citizens — Civil Society Toolbox',
            description: 'DIY εργαλεία, μέθοδοι και εργαστήρια για δρώντες της κοινωνίας πολιτών.',
            engDescription: 'DIY tools, methods, and workshops for civil society actors.',
            url: 'https://civilsocietytoolbox.org/about/',
          },
        ],
      },
      {
        key: 'mobility',
        name: 'Κινητικότητα',
        fullName: 'Κινητικότητα & Διεθνής Συνεργασία',
        description: 'Εργαλεία κινητικότητας, χρηματοδότησης και δίκαιων διεθνών συνεργασιών.',
        engDescription: 'Mobility tools, funding guides, and fair international collaboration resources.',
        resources: [
          {
            title: 'ENCC — Toolkit on Mobility for Cultural Centre Professionals',
            description: 'Οδηγός κινητικότητας πολιτιστικών εργαζομένων.',
            engDescription: 'Guide to support the mobility of cultural operators and guide their learning experience.',
            url: 'https://encc.eu/articles/toolkit-on-mobility-for-cultural-centre-professionals',
          },
          {
            title: 'IETM & On the Move — Fairer International Collaborations',
            engTitle: 'IETM & On the Move — Toolkit for Fairer International Collaborations',
            description: 'Οδηγός για δικαιότερη προσέγγιση σε διεθνείς και διαπολιτισμικές συνεργασίες.',
            engDescription: 'Guide on why and how to adopt a more equitable approach to international collaborations.',
            url: 'https://on-the-move.org/librarynew/guidesandtoolkits/107/fair-collaborations/',
          },
          {
            title: 'IETM — Fund-Finder',
            engTitle: 'IETM — Guide to Funding Opportunities for Arts and Culture in Europe',
            description: 'Ολοκληρωμένη επισκόπηση ευκαιριών χρηματοδότησης πέρα από το Creative Europe.',
            engDescription: 'Comprehensive overview of public and private funding opportunities beyond Creative Europe.',
            url: 'https://www.ietm.org/en/resources/toolkits',
          },
          {
            title: 'On the Move — Guides & Toolkits Collection',
            description: '60+ οδηγοί χρηματοδότησης, πόροι βίζας και πράσινης κινητικότητας.',
            engDescription: '60+ country-specific funding guides, visa resources, and green mobility guides.',
            url: 'https://on-the-move.org/librarynew/guidesandtoolkits/',
          },
        ],
      },
      {
        key: 'skills',
        name: 'Δεξιότητες',
        fullName: 'Δεξιότητες & Ικανότητες',
        description: 'Εργαλεία ανάπτυξης δεξιοτήτων για τον πολιτιστικό και δημιουργικό τομέα.',
        engDescription: 'Skills development tools for the cultural and creative sectors.',
        resources: [
          {
            title: 'Cyanotypes Toolkit — Strategic Skills for Creative Futures',
            description: 'Εργαλειοθήκη Erasmus+ για κενά δεξιοτήτων στον πολιτιστικό τομέα, με εκπαιδευτικά modules για την τριπλή μετάβαση.',
            engDescription: 'Erasmus+ project toolkit for addressing skills gaps in cultural and creative sectors, with training modules on the triple transition.',
            url: 'https://toolkit.cyanotypes.website/',
          },
        ],
      },
      {
        key: 'governance',
        name: 'Διακυβέρνηση',
        fullName: 'Διακυβέρνηση ΜΚΟ',
        description: 'Πλαίσια και πρακτικές χρηστής διακυβέρνησης μη κερδοσκοπικών οργανισμών.',
        engDescription: 'Governance frameworks and practices for nonprofit organisations.',
        resources: [
          {
            title: 'BoardSource — Recommended Governance Practices',
            description: 'Ολοκληρωμένος οδικός χάρτης για ΔΣ: ποικιλομορφία, αξιολόγηση, ηθική, στρατηγική.',
            engDescription: 'Comprehensive roadmap for boards covering diversity, evaluation, ethics, and strategic recruitment.',
            url: 'https://boardsource.org/wp-content/uploads/2016/10/Recommended-Gov-Practices.pdf',
          },
          {
            title: 'National Council of Nonprofits — Good Governance Policies',
            description: 'Πρακτικά σημεία αναφοράς διακυβέρνησης: σύγκρουση συμφερόντων, αυτοαξιολόγηση, ένταξη.',
            engDescription: 'Practical governance benchmarks including conflict of interest, self-assessment, and inclusion.',
            url: 'https://www.councilofnonprofits.org/running-nonprofit/governance-leadership/good-governance-policies-nonprofits',
          },
          {
            title: 'Building Movement Project — NICE Guide',
            engTitle: 'Building Movement Project — Nonprofits Integrating Community Engagement',
            description: 'Πλαίσια ενσωμάτωσης κοινοτικής συμμετοχής στη διακυβέρνηση ΜΚΟ.',
            engDescription: 'Frameworks for embedding community engagement into nonprofit governance and service delivery.',
            url: 'https://buildingmovement.org/wp-content/uploads/2019/08/Nonprofits-Integrating-Community-Engagement-Guide.pdf',
          },
        ],
      },
      {
        key: 'toolkit-collections',
        name: 'Συλλογές',
        fullName: 'Συλλογές Εργαλείων',
        description: 'Ολοκληρωμένες βιβλιοθήκες εργαλείων από ευρωπαϊκά πολιτιστικά δίκτυα.',
        engDescription: 'Comprehensive toolkit libraries from European cultural networks.',
        resources: [
          {
            title: 'ENCC — Guides & Toolkits',
            description: 'Βιβλιοθήκη οδηγών και εργαλειοθηκών του ENCC.',
            engDescription: 'ENCC\'s library of guides and toolkits.',
            url: 'https://encc.eu/articles/index/guides-and-toolkits',
          },
          {
            title: 'Trans Europe Halles — Resources',
            description: 'Πόροι του δικτύου Trans Europe Halles.',
            engDescription: 'Trans Europe Halles network resources.',
            url: 'https://www.teh.net/resources/',
          },
          {
            title: 'On the Move — Guides & Toolkits',
            description: 'Οδηγοί και εργαλειοθήκες κινητικότητας.',
            engDescription: 'Mobility guides and toolkits.',
            url: 'https://on-the-move.org/librarynew/guidesandtoolkits/',
          },
          {
            title: 'IETM — Resources',
            description: 'Πόροι του διεθνούς δικτύου σύγχρονων παραστατικών τεχνών.',
            engDescription: 'International network for contemporary performing arts resources.',
            url: 'https://www.ietm.org/en/resources',
          },
          {
            title: 'Mass Cultural Council — Capacity Building Toolkit',
            description: 'Εργαλειοθήκη ανάπτυξης ικανοτήτων πολιτιστικών οργανισμών.',
            engDescription: 'Capacity building toolkit for cultural organisations.',
            url: 'https://massculturalcouncil.org/organizations/capacity-building-toolkit/',
          },
        ],
      },
    ],
  },

  // ──────────────────────────────────────────────
  // 2. ΕΚΠΑΙΔΕΥΣΕΙΣ
  // ──────────────────────────────────────────────
  {
    key: 'trainings',
    name: 'Εκπαιδεύσεις',
    engName: 'Trainings',
    description: 'Εκπαιδευτικό υλικό από σεμινάρια, webinars και εργαστήρια του δικτύου.',
    engDescription: 'Training materials from network seminars, webinars, and workshops.',
    icon: '🎓',
    subcategories: [
      {
        key: 'business-plan',
        name: 'Business Plan Webinar',
        fullName: 'Business Plan Webinar',
        description: 'Webinar για τη δημιουργία business plan στον πολιτιστικό τομέα.',
        engDescription: 'Webinar on creating a business plan in the cultural sector.',
        externalUrl: 'https://drive.google.com/drive/folders/1tYFBsv1mfFY4scttaCNSxjUCoBoDSpGm?usp=share_link',
        resources: [],
      },
      {
        key: 'accounting',
        name: 'Λογιστικά ΜΚΟ',
        fullName: 'Λογιστικά & Οικονομικά ΜΚΟ',
        description: 'Εκπαίδευση σε λογιστικά και οικονομικά ζητήματα μη κερδοσκοπικών οργανισμών.',
        engDescription: 'Training on accounting and financial issues for non-profit organisations.',
        externalUrl: 'https://drive.google.com/drive/folders/1PHsDD8eosVOgnf2BszuIz68Uxupdpg2F?usp=share_link',
        resources: [],
      },
      {
        key: 'creative-europe',
        name: 'Creative Europe',
        fullName: 'Creative Europe',
        description: 'Εκπαίδευση για το πρόγραμμα Creative Europe της ΕΕ.',
        engDescription: 'Training on the EU Creative Europe programme.',
        externalUrl: 'https://drive.google.com/drive/folders/1ihVwaYCwl7sJxpx_wSwY1Vv8PKDkbgmC?usp=share_link',
        resources: [],
      },
      {
        key: 'erasmus',
        name: 'Erasmus+',
        fullName: 'Erasmus+',
        description: 'Εκπαίδευση για το πρόγραμμα Erasmus+.',
        engDescription: 'Training on the Erasmus+ programme.',
        externalUrl: 'https://drive.google.com/drive/folders/15Hqm3wWjlOa4gRhoeu4CWrpJfEUYIRG2?usp=share_link',
        resources: [],
      },
      {
        key: 'impact-measurement-1',
        name: 'Μέτρηση Αντικτύπου (1ο)',
        fullName: 'Μέτρηση Αντικτύπου (1ο)',
        description: 'Πρώτο εργαστήριο μέτρησης κοινωνικού αντίκτυπου.',
        engDescription: 'First workshop on social impact measurement.',
        externalUrl: 'https://drive.google.com/drive/folders/1fgQXVj5SsmSembhP8_itSEupT3Qjw8F6?usp=share_link',
        resources: [],
      },
      {
        key: 'connecting-networks',
        name: 'Connecting Networks',
        fullName: 'Connecting Networks Learning Lab',
        description: 'Εργαστήριο μάθησης για τη σύνδεση πολιτιστικών δικτύων.',
        engDescription: 'Learning lab on connecting cultural networks.',
        externalUrl: 'https://drive.google.com/drive/folders/1IOahVpOvpr_7wVXm14lIP3fPIhPUsdlW?usp=share_link',
        resources: [],
      },
      {
        key: 'impact-measurement-2',
        name: 'Μέτρηση Αντικτύπου (2ο)',
        fullName: 'Μέτρηση Αντικτύπου (2ο)',
        description: 'Δεύτερο εργαστήριο μέτρησης κοινωνικού αντίκτυπου.',
        engDescription: 'Second workshop on social impact measurement.',
        externalUrl: 'https://drive.google.com/drive/folders/1jCrRbhEFUdhm101Iyv2at15QvcKWtddL?usp=share_link',
        resources: [],
      },
      {
        key: 'harvesting-design',
        name: 'Harvesting Design Sprint',
        fullName: 'Harvesting Design Sprint',
        description: 'Εργαστήριο σχεδιαστικής σκέψης (design sprint).',
        engDescription: 'Design sprint workshop.',
        externalUrl: 'https://drive.google.com/drive/folders/1SCIwSWORfWAdVb6v6qVxTTSOJ4QT-12Z?usp=sharing',
        resources: [],
      },
      {
        key: 'eu-cultural-policy',
        name: 'Ευρωπ. Πολιτιστική Πολιτική',
        fullName: 'Ευρωπαϊκή Πολιτιστική Πολιτική',
        description: 'Εκπαίδευση σε θέματα ευρωπαϊκής πολιτιστικής πολιτικής.',
        engDescription: 'Training on European cultural policy issues.',
        externalUrl: 'https://drive.google.com/drive/folders/1E7dT2qz1gOWO1lYj6xoDVzwWNAy7CB-s?usp=share_link',
        resources: [],
      },
      {
        key: 'elefsina-workshops',
        name: 'Εργαστήρια Ελευσίνας',
        fullName: 'Εργαστήρια Ελευσίνας',
        description: 'Εργαστήρια στο πλαίσιο της Ελευσίνας Πολιτιστικής Πρωτεύουσας.',
        engDescription: 'Workshops in the context of Eleusis Cultural Capital.',
        externalUrl: 'https://drive.google.com/drive/folders/1b_tgdX142nzQh8XuS_y0croYKGj4c8Jz?usp=share_link',
        resources: [],
      },
      {
        key: 'cci-patra',
        name: '6ο Συνέδριο CCI Πάτρα',
        fullName: '6ο Συνέδριο CCI Πάτρα',
        description: 'Υλικό από το 6ο Συνέδριο Πολιτιστικών & Δημιουργικών Βιομηχανιών στην Πάτρα.',
        engDescription: 'Material from the 6th Cultural & Creative Industries Conference in Patras.',
        externalUrl: 'https://drive.google.com/drive/folders/1Br-g9woPBW9vTks5fOhurqkI0LQCizuk?usp=share_link',
        resources: [],
      },
      {
        key: 'digital-transformation',
        name: 'Digital Transformation',
        fullName: 'Digital Transformation',
        description: 'Εκπαίδευση για τον ψηφιακό μετασχηματισμό στον πολιτιστικό τομέα.',
        engDescription: 'Training on digital transformation in the cultural sector.',
        externalUrl: 'https://drive.google.com/drive/folders/1KOmf8zfnmov5Z0O4_Wez04YlBFuu1eys?usp=share_link',
        resources: [],
      },
      {
        key: 'inclusive-language',
        name: 'Συμπεριληπτική Γλώσσα',
        fullName: 'Εργαστήρια Συμπεριληπτικής Γλώσσας',
        description: 'Εργαστήρια για τη χρήση συμπεριληπτικής γλώσσας.',
        engDescription: 'Workshops on inclusive language usage.',
        externalUrl: 'https://drive.google.com/drive/folders/1RAeNeyzOxhfaHTL0p_QIgIV2r6pjX7YM?usp=share_link',
        resources: [],
      },
      {
        key: 'robert-bosch',
        name: 'Robert Bosch & Inequality',
        fullName: 'Robert Bosch & Inequality',
        description: 'Εκπαίδευση για τις ανισότητες σε συνεργασία με το Ίδρυμα Robert Bosch.',
        engDescription: 'Training on inequality in collaboration with the Robert Bosch Foundation.',
        externalUrl: 'https://drive.google.com/drive/folders/1gYnjrFw1c6MjP8ZgxmCwfq02RsSBTfKD?usp=share_link',
        resources: [],
      },
    ],
  },

  // ──────────────────────────────────────────────
  // 3. ΚΑΛΕΣ ΠΡΑΚΤΙΚΕΣ (ΜΕΡΟΣ Β)
  // ──────────────────────────────────────────────
  {
    key: 'good-practices',
    name: 'Καλές Πρακτικές',
    engName: 'Good Practices',
    description: 'Έρευνες, αναφορές και παραδείγματα καλών πρακτικών που εμπνέουν τη δουλειά πολιτιστικών οργανισμών.',
    engDescription: 'Research, reports, and examples of good practices that inspire the work of cultural organisations.',
    icon: '⭐',
    subcategories: [
      {
        key: 'social-innovation',
        name: 'Κοιν. Καινοτομία',
        fullName: 'Κοινωνική Καινοτομία',
        description: 'Ευρωπαϊκές δράσεις, πλαίσια και μελέτες κοινωνικής καινοτομίας στον πολιτισμό.',
        engDescription: 'EU actions, frameworks, and case studies on social innovation in culture.',
        resources: [
          {
            title: 'European Commission — Social Innovation',
            description: 'Επισκόπηση δράσεων ΕΕ για κοινωνική καινοτομία.',
            engDescription: 'Overview of EU actions on social innovation including funding, networking, and incubation.',
            url: 'https://single-market-economy.ec.europa.eu/industry/strategy/innovation/social_en',
          },
          {
            title: 'European Social Fund Plus — Social Innovation',
            description: 'Πώς το ESF+ υποστηρίζει κοινωνική καινοτομία μέσω προγραμμάτων κρατών-μελών.',
            engDescription: 'How ESF+ supports social innovation through Member State programmes.',
            url: 'https://european-social-fund-plus.ec.europa.eu/en/social-innovation',
          },
          {
            title: 'OECD — Starting, Scaling and Sustaining Social Innovation',
            description: 'Το "3S Framework" για ανάπτυξη και διατήρηση αντίκτυπου κοινωνικής καινοτομίας.',
            engDescription: 'The "3S Framework" for developing and sustaining the impact of social innovation.',
            url: 'https://www.oecd.org/en/publications/starting-scaling-and-sustaining-social-innovation_ec1dfb67-en/full-report/component-6.html',
          },
          {
            title: 'Social Innovation Academy — 8 European Social Innovations',
            description: 'Μελέτες περίπτωσης κοινωνικής καινοτομίας, συμπεριλαμβανομένης της REvive Greece.',
            engDescription: 'Case studies including REvive Greece.',
            url: 'https://www.socialinnovationacademy.eu/8-european-social-innovations-worth-knowing/',
          },
          {
            title: 'Nesta — Social Innovation & Policymakers',
            engTitle: 'Nesta — Five Things Europe\'s Social Innovation Community Needs from Policymakers',
            description: 'Βασικά ευρήματα από διαβούλευση με 350+ κοινωνικούς καινοτόμους.',
            engDescription: 'Key findings from a consultation with 350+ social innovators.',
            url: 'https://www.nesta.org.uk/blog/five-things-europes-social-innovation-community-needs-policymakers/',
          },
          {
            title: 'Interreg Europe — Culture for Change as Good Practice',
            description: 'Το CForC αναγνωρίστηκε ως ευρωπαϊκή καλή πρακτική κοινωνικής καινοτομίας.',
            engDescription: 'CForC recognised as a European good practice in social innovation.',
            url: 'https://www.interregeurope.eu/good-practices/culture-for-change-0',
          },
        ],
      },
      {
        key: 'cultural-policy',
        name: 'Πολιτ. Πολιτική',
        fullName: 'Πολιτιστική Πολιτική & Συνηγορία',
        description: 'Αναφορές και αναλύσεις ευρωπαϊκής πολιτιστικής πολιτικής.',
        engDescription: 'Reports and analyses on European cultural policy and advocacy.',
        resources: [
          {
            title: 'Culture Action Europe — The EU\'s Culture Compass',
            description: 'Ανάλυση στρατηγικής πολιτισμού ΕΕ 2025 με 20 εμβληματικές πρωτοβουλίες.',
            engDescription: 'Analysis of the EU\'s 2025 culture strategy with 20 flagship initiatives.',
            url: 'https://cultureactioneurope.org/news/the-eus-new-culture-strategy-is-out-culture-action-europe-unpacks/',
          },
          {
            title: 'Culture Action Europe — State of Culture Report',
            description: 'Ολοκληρωμένη αναφορά για την κατάσταση του πολιτιστικού τομέα στην Ευρώπη.',
            engDescription: 'Comprehensive report on the state of the cultural sector in Europe.',
            url: 'https://cultureactioneurope.org/wp-content/uploads/2024/10/State-of-Culture-Report_final_version.pdf',
          },
          {
            title: 'Culture Action Europe — Cultural Participation Blueprint',
            description: 'Συστάσεις για πολιτιστική συμμετοχή, ασφαλείς χώρους και ανάπτυξη κοινού.',
            engDescription: 'Recommendations on cultural participation, safe spaces, and inclusive audience development.',
            url: 'https://cultureactioneurope.org/advocacy/cultural-participation-towards-the-culture-compass-a-sector-blueprint/',
          },
          {
            title: 'Culture Action Europe — Cultural Policy in 2025',
            description: 'Βασικές εξελίξεις: ρύθμιση AI, Culture2030Goal, καλλιτεχνική ελευθερία.',
            engDescription: 'Key developments including AI regulation, Culture2030Goal, and artistic freedom.',
            url: 'https://cultureactioneurope.org/news/things-to-follow-cultural-policy-in-2025/',
          },
          {
            title: 'Creative Pulse Survey — Working Conditions',
            engTitle: 'Creative Pulse Survey — Working Conditions of Artists in Europe',
            description: 'Ευρήματα έρευνας από 1.200+ πολιτιστικούς επαγγελματίες.',
            engDescription: 'Survey findings from 1,200+ cultural professionals.',
            url: 'https://cultureactioneurope.org/news/creativepulsesurvey/',
          },
          {
            title: 'European Audiovisual Observatory — Status of Artists (2025)',
            description: 'Προκλήσεις καλλιτεχνών: άτυπη εργασία, κοινωνική προστασία, κινητικότητα.',
            engDescription: 'Challenges facing artists: atypical employment, social protection gaps, cross-border mobility.',
            url: 'https://rm.coe.int/iris-the-status-of-artists-and-cultural-and-creative-professionals-in-/488028b282',
          },
        ],
      },
      {
        key: 'digital-ethics-gp',
        name: 'Ψηφιακή Ηθική & AI',
        fullName: 'Ψηφιακή Ηθική & AI στον Πολιτισμό',
        description: 'Πολιτικές, πλαίσια και συζητήσεις για AI και ψηφιακή ηθική στον πολιτιστικό τομέα.',
        engDescription: 'Policies, frameworks, and discussions on AI and digital ethics in the cultural sector.',
        resources: [
          {
            title: 'Culture Action Europe — Action Group on Digital & AI',
            description: 'Πολιτικές κατευθύνσεις για AI στον πολιτισμό και εφαρμογή EU AI Act.',
            engDescription: 'Policy guidance on AI integration in cultural sectors and EU AI Act implementation.',
            url: 'https://cultureactioneurope.org/action-groups/digital-and-ai/',
          },
          {
            title: 'Culture Action Europe — Culture and Digital Blueprint',
            description: 'Συστάσεις για ψηφιακή διακυβέρνηση, στρατηγική AI, πνευματικά δικαιώματα.',
            engDescription: 'Recommendations on digital governance, AI strategy, copyright, and digital sovereignty.',
            url: 'https://cultureactioneurope.org/advocacy/culture-and-digital-towards-the-culture-compass-a-sector-blueprint/',
          },
          {
            title: 'European Parliament — AI in Cultural & Creative Sectors',
            description: 'Έρευνα για τον αντίκτυπο AI στην πολιτιστική ποικιλομορφία και ηθικά πλαίσια.',
            engDescription: 'Research on AI\'s impact on cultural diversity, ethical frameworks, and the creative value chain.',
            url: 'https://www.europarl.europa.eu/RegData/etudes/BRIE/2020/629220/IPOL_BRI(2020)629220_EN.pdf',
          },
          {
            title: 'ENCC — Cultural Organisations and AI',
            description: 'Συζήτηση για τις αντιδράσεις πολιτιστικών οργανισμών στην AI.',
            engDescription: 'Discussion on cultural organisations\' responses to AI with a focus on critical capacity-building.',
            url: 'https://encc.eu/articles/cultural-organisations-and-ai-ethics-and-practices',
          },
          {
            title: 'ENCC — Digital Ethics Working Group',
            description: 'Διατομεακή πλατφόρμα για εναλλακτικές στα εργαλεία Big Tech.',
            engDescription: 'Ongoing cross-sectoral platform exploring alternatives to Big Tech tools.',
            url: 'https://encc.eu/articles/digital-ethics',
          },
        ],
      },
      {
        key: 'sustainability-gp',
        name: 'Βιωσιμότητα',
        fullName: 'Βιωσιμότητα',
        description: 'Πιστοποίηση, πρακτικές και πόροι βιωσιμότητας για πολιτιστικά δίκτυα.',
        engDescription: 'Eco-certification, practices, and sustainability resources for cultural networks.',
        resources: [
          {
            title: 'Culture Action Europe — SHIFT Eco-Certification',
            description: 'Πρόγραμμα οικο-πιστοποίησης για πολιτιστικά δίκτυα.',
            engDescription: 'Eco-certification programme for cultural networks.',
            url: 'https://cultureactioneurope.org/projects/shift-culture/',
          },
          {
            title: 'Culture Action Europe — Culture & Sustainability',
            engTitle: 'Culture Action Europe — How Culture is Reimagining its Role in Sustainability',
            description: 'Η εξελισσόμενη σχέση πολιτισμού-κλιματικής δράσης, EMCCINNO και SHIFT.',
            engDescription: 'Overview of the sector\'s evolving relationship with climate action.',
            url: 'https://cultureactioneurope.org/news/stay-awhile-how-culture-is-reimagining-its-role-in-sustainability/',
          },
          {
            title: 'Creative Carbon Scotland — SHIFT Culture Eco-Certificate',
            description: 'Πόροι ομοτίμων και ελέγχου για πολιτιστικά δίκτυα.',
            engDescription: 'Peer support and auditing resources for cultural networks.',
            url: 'https://www.creativecarbonscotland.com/project/shift-culture-eco-certificate/',
          },
        ],
      },
      {
        key: 'civil-society',
        name: 'Κοινωνία Πολιτών',
        fullName: 'Κοινωνία Πολιτών & Κοινοτική Ανάπτυξη',
        description: 'Πόροι για την κοινωνία πολιτών, ΜΚΟ και κοινοτική ανάπτυξη στην Ελλάδα και Ευρώπη.',
        engDescription: 'Resources on civil society, NGOs, and community development in Greece and Europe.',
        resources: [
          {
            title: 'European Heritage Hub — Athens Conference',
            engTitle: 'European Heritage Hub — Connecting Civil Society for Heritage',
            description: 'Διασυνοριακή συνεργασία κοινωνίας πολιτών για πολιτιστική κληρονομιά.',
            engDescription: 'Cross-border cooperation for cultural heritage civil society.',
            url: 'https://www.europeanheritagehub.eu/event/connecting-civil-society-for-heritage-conference/',
          },
          {
            title: 'Greek Civil Society Network — Research Project',
            description: 'Ακαδημαϊκή έρευνα αξιολόγησης ελληνικών ΜΚΟ.',
            engDescription: 'Academic research on evaluating Greek NGOs across accountability and efficiency.',
            url: 'https://greekcivilsocietynetwork.wordpress.com/',
          },
          {
            title: 'Sustainable Greece — Civil Society Initiative',
            description: 'Δίκτυο ΜΚΟ γύρω από πρακτικές βιώσιμης ανάπτυξης στην Ελλάδα.',
            engDescription: 'Network connecting civil society organisations around sustainable development in Greece.',
            url: 'https://sustainable-greece.com/en/sustainable-greece-initiative/civil-society-organizations.60.html',
          },
          {
            title: 'European Commission — Social Enterprises',
            description: 'Πλαίσιο ΕΕ για κοινωνικές επιχειρήσεις και οικοσυστήματα κοινωνικής οικονομίας.',
            engDescription: 'EU framework on social enterprises and support for social economy ecosystems.',
            url: 'https://ec.europa.eu/growth/sectors/proximity-and-social-economy/social-economy-eu/social-enterprises_es',
          },
        ],
      },
      {
        key: 'culture-health',
        name: 'Πολιτισμός & Υγεία',
        fullName: 'Πολιτισμός & Υγεία',
        description: 'Έρευνα για τον ρόλο του πολιτισμού στην υγεία και ευημερία.',
        engDescription: 'Research on culture\'s role in health and wellbeing.',
        resources: [
          {
            title: 'Horizon Europe — Culture, Arts, Health & Wellbeing',
            engTitle: 'Horizon Europe — Impacts of Culture and the Arts on Health and Wellbeing',
            description: 'Πλαίσιο χρηματοδότησης και έρευνας ΕΕ για πολιτισμό και ευημερία.',
            engDescription: 'EU funding call and research framework on culture\'s role in community wellbeing.',
            url: 'https://www.euro-access.eu/en/calls/2040/Impacts-of-culture-and-the-arts-on-health-and-well-being',
          },
          {
            title: 'RealWorth — Culture & Social Impact',
            engTitle: 'RealWorth — How Culture Can Hit the Right Note for Social Impact',
            description: 'Έρευνα για την κοινωνική αξία της πολιτιστικής συμμετοχής.',
            engDescription: 'Research on the social value of cultural participation, including wellbeing outcomes.',
            url: 'https://www.realworth.org/insights/the-value-of-investing-in-music-and-culture',
          },
        ],
      },
      {
        key: 'peripheral-areas',
        name: 'Περιφέρεια',
        fullName: 'Πολιτισμός σε Περιφερειακές Περιοχές',
        description: 'Πόροι για τον ρόλο του πολιτισμού σε περιφερειακές και μη αστικές περιοχές.',
        engDescription: 'Resources on the role of culture in peripheral and non-urban areas.',
        resources: [
          {
            title: 'Synergies of CCI in Peripheral Areas',
            description: 'Έρευνα για τη δικτύωση και κοινωνικό κεφάλαιο σε περιφερειακές περιοχές της Ελλάδας.',
            engDescription: 'Research on networking and social capital in peripheral areas of Greece.',
            url: 'https://colab.ws/articles/10.3390/heritage7080212',
          },
          {
            title: 'EKT — Digitisation of Cultural Heritage in Greece',
            description: 'Ελληνικές πρακτικές ψηφιοποίησης πολιτιστικής κληρονομιάς.',
            engDescription: 'Greek practices in digitising cultural heritage.',
            url: 'https://www.ekt.gr/en/news/23330',
          },
          {
            title: 'ENCC — Resources on Non-Urban Culture',
            description: 'Πόροι για τον ρόλο πολιτιστικών κέντρων σε αγροτικές περιοχές.',
            engDescription: 'Resources on the role of cultural centres in rural and non-urban areas.',
            url: 'https://encc.eu/articles/resources-on-non-urban-culture',
          },
        ],
      },
      {
        key: 'mobility-gp',
        name: 'Κινητικότητα',
        fullName: 'Κινητικότητα & Εργασιακές Συνθήκες',
        description: 'Τάσεις κινητικότητας, εργασιακές συνθήκες και οδηγοί ένταξης στον πολιτιστικό τομέα.',
        engDescription: 'Mobility trends, working conditions, and inclusion guides in the cultural sector.',
        resources: [
          {
            title: 'On the Move — Cultural Mobility Yearbook 2025',
            description: 'Ετήσια ανάλυση τάσεων πολιτιστικής κινητικότητας.',
            engDescription: 'Annual analysis of cultural mobility trends with focus on young and emerging arts workers.',
            url: 'https://on-the-move.org/resources/library/cultural-mobility-yearbook-2025',
          },
          {
            title: 'This Is How We Work',
            description: 'Πλατφόρμα ΕΕ με συγκριτικές εργασιακές συνθήκες πολιτιστικού τομέα σε 27 κράτη.',
            engDescription: 'EU-wide platform with comparative information on working conditions across all 27 member states.',
            url: 'https://on-the-move.org/mobility-information-points/resources',
          },
          {
            title: 'Trans Europe Halles — Diversity and Inclusion Handbook',
            description: 'Εγχειρίδιο ποικιλομορφίας και ένταξης (2021).',
            engDescription: 'Diversity and Inclusion Handbook (2021).',
            url: 'https://www.teh.net/resources/',
          },
          {
            title: 'Trans Europe Halles — Smart and Fearless',
            description: 'Οδηγίες για αναδυόμενα κέντρα τεχνών σε Ανατολική, ΝΑ και Νότια Ευρώπη.',
            engDescription: 'Guidelines for emerging arts centres in Eastern, Southeastern and Southern Europe.',
            url: 'https://www.teh.net/resources/',
          },
        ],
      },
      {
        key: 'eu-networks',
        name: 'Ευρωπαϊκά Δίκτυα',
        fullName: 'Ευρωπαϊκά Δίκτυα & Πλατφόρμες',
        description: 'Βασικά ευρωπαϊκά δίκτυα σχετικά με τα μέλη του CForC.',
        engDescription: 'Key European networks relevant to CForC members.',
        resources: [
          {
            title: 'Culture Action Europe',
            description: 'Συνηγορία πολιτιστικής πολιτικής.',
            engDescription: 'Cultural policy advocacy.',
            url: 'https://cultureactioneurope.org',
          },
          {
            title: 'European Network of Cultural Centres (ENCC)',
            description: 'Κοινωνικά προσανατολισμένα πολιτιστικά κέντρα.',
            engDescription: 'Social-oriented cultural centres.',
            url: 'https://encc.eu',
          },
          {
            title: 'Trans Europe Halles (TEH)',
            description: 'Λαϊκά πολιτιστικά κέντρα σε επαναχρησιμοποιημένους χώρους.',
            engDescription: 'Grassroots cultural centres in repurposed spaces.',
            url: 'https://www.teh.net',
          },
          {
            title: 'On the Move',
            description: 'Δίκτυο πληροφοριών πολιτιστικής κινητικότητας.',
            engDescription: 'Cultural mobility information network.',
            url: 'https://on-the-move.org',
          },
          {
            title: 'IETM',
            description: 'Διεθνές δίκτυο σύγχρονων παραστατικών τεχνών.',
            engDescription: 'International network for contemporary performing arts.',
            url: 'https://www.ietm.org',
          },
          {
            title: 'ENCATC',
            description: 'Εκπαίδευση πολιτιστικής διαχείρισης και πολιτικής.',
            engDescription: 'Cultural management and policy education.',
            url: 'https://www.encatc.org',
          },
          {
            title: 'CreativesUnite',
            description: 'Ευρωπαϊκή πλατφόρμα πόρων πολιτιστικού τομέα.',
            engDescription: 'European platform for cultural sector resources.',
            url: 'https://creativesunite.eu',
          },
        ],
      },
    ],
  },
]
