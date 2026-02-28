// Networks & Communities Data
// Hardcoded directory for CforC members

export interface Network {
  title: string
  description: string
  engDescription: string
  url: string
}

export interface NetworkGroup {
  key: string
  label: string
  engLabel: string
  networks: Network[]
}

export const networkGroups: NetworkGroup[] = [
  {
    key: 'member',
    label: 'Δίκτυα στων οποίων είμαστε μέλη',
    engLabel: 'Networks we are members of',
    networks: [
      {
        title: 'Culture Action Europe (CAE)',
        description: 'Συνηγορία πολιτιστικής πολιτικής. Το μεγαλύτερο ευρωπαϊκό δίκτυο με 130+ οργανισμούς από 37 χώρες.',
        engDescription: 'The largest European network on cultural policy advocacy, bringing together 130+ organisations from 37 countries.',
        url: 'https://cultureactioneurope.org',
      },
      {
        title: 'European Network of Cultural Centres (ENCC)',
        description: 'Κοινωνικά προσανατολισμένα πολιτιστικά κέντρα. 181 οργανισμοί σε 39 χώρες.',
        engDescription: 'Unites 181 socio-cultural organisations in 39 countries. Provides toolkits, training, and advocacy on sustainability, digital ethics, and inclusion.',
        url: 'https://encc.eu',
      },
      {
        title: 'Reset!',
        description: 'Ευρωπαϊκό δίκτυο ανεξάρτητων πολιτιστικών και μιντιακών οργανισμών. 66+ μέλη από 25+ χώρες.',
        engDescription: 'European network of independent cultural and media organisations. 66+ members from 25+ countries advocating for independence, pluralism, and diversity.',
        url: 'https://reset-network.eu',
      },
      {
        title: 'Bosch Alumni Network (BAN)',
        description: 'Δίκτυο αποφοίτων του Ιδρύματος Robert Bosch. 9.000 μέλη σε 140 χώρες.',
        engDescription: 'Global network of ~9,000 former and current fellows of the Robert Bosch Stiftung across 140 countries.',
        url: 'https://www.boschalumni.net',
      },
      {
        title: 'Anna Lindh Foundation (ALF)',
        description: 'Ευρω-Μεσογειακός διαπολιτισμικός διάλογος. 4.000+ μέλη σε 43 χώρες.',
        engDescription: 'Euro-Mediterranean intergovernmental organisation with 4,000+ member organisations across 43 countries promoting intercultural dialogue.',
        url: 'https://alf.website/en/',
      },
      {
        title: 'The Possibilists',
        description: 'Παγκόσμια συμμαχία για νέους κοινωνικούς καινοτόμους. 20+ δίκτυα νέων και 250 τοπικοί οργανισμοί.',
        engDescription: 'Global alliance of 20+ youth social innovation networks and nearly 250 local youth organisations.',
        url: 'https://thepossibilists.org',
      },
      {
        title: 'Community Arts Network (CAN)',
        description: 'Παγκόσμιο δίκτυο τέχνης και κοινωνικού αντίκτυπου. 1.000+ μέλη σε 80 χώρες.',
        engDescription: 'Global platform of over 1,000 members across 80 countries exploring the power of arts for social change.',
        url: 'https://www.community-arts.net',
      },
    ],
  },
  {
    key: 'related',
    label: 'Σχετικά δίκτυα & οργανισμοί',
    engLabel: 'Related networks & organisations',
    networks: [
      {
        title: 'Trans Europe Halles (TEH)',
        description: 'Λαϊκά πολιτιστικά κέντρα σε επαναχρησιμοποιημένους χώρους. 170+ κέντρα σε 40+ χώρες.',
        engDescription: 'International network of 170+ grassroots, community-led cultural centres in repurposed buildings across 40+ countries.',
        url: 'https://www.teh.net',
      },
      {
        title: 'On the Move',
        description: 'Δίκτυο πληροφοριών πολιτιστικής κινητικότητας. 75+ οργανισμοί.',
        engDescription: 'Cultural mobility information network of 75+ organisations. Provides 60+ country-specific funding guides and visa resources.',
        url: 'https://on-the-move.org',
      },
      {
        title: 'IETM',
        description: 'Διεθνές δίκτυο σύγχρονων παραστατικών τεχνών. 450+ οργανισμοί.',
        engDescription: 'International network of 450+ performing arts organisations worldwide.',
        url: 'https://www.ietm.org',
      },
      {
        title: 'ENCATC',
        description: 'Εκπαίδευση πολιτιστικής διαχείρισης και πολιτικής. 40+ χώρες.',
        engDescription: 'European network on cultural management and cultural policy education across 40+ countries.',
        url: 'https://www.encatc.org',
      },
      {
        title: 'CreativesUnite',
        description: 'Ευρωπαϊκή πλατφόρμα πόρων πολιτιστικού τομέα.',
        engDescription: 'European platform gathering resources, news, and funding opportunities for the cultural and creative sectors.',
        url: 'https://creativesunite.eu',
      },
      {
        title: 'European Cultural Foundation (ECF)',
        description: 'Υποστήριξη δημοκρατίας μέσω πολιτισμού. Culture of Solidarity Fund.',
        engDescription: 'Amsterdam-based foundation supporting culture as a force for democratic resilience and solidarity.',
        url: 'https://culturalfoundation.eu',
      },
      {
        title: 'Europa Nostra',
        description: 'Ευρωπαϊκό δίκτυο πολιτιστικής κληρονομιάς. European Heritage Awards.',
        engDescription: 'Leading European heritage network. Runs the European Heritage Awards and advocates for heritage preservation.',
        url: 'https://www.europanostra.org',
      },
      {
        title: 'EIT Culture & Creativity',
        description: 'Κοινότητα καινοτομίας ΕΕ. 1.300+ εταίροι σε 30+ χώρες.',
        engDescription: 'EU Innovation Community with 1,300+ partners across 30+ countries supporting innovation in the cultural and creative sectors.',
        url: 'https://eit-culture-creativity.eu',
      },
      {
        title: "Julie's Bicycle",
        description: 'Πράσινη μετάβαση & κλιματική δράση στον πολιτιστικό τομέα.',
        engDescription: 'UK-based charity supporting the cultural sector\'s response to the climate crisis with Creative Green Tools.',
        url: 'https://juliesbicycle.org',
      },
      {
        title: 'SHIFT Culture',
        description: 'Οικο-πιστοποίηση και βιωσιμότητα για πολιτιστικά δίκτυα. 17 δίκτυα.',
        engDescription: 'Eco-certification and sustainability guidelines for cultural networks. 17 participating networks.',
        url: 'https://shift-culture.eu',
      },
      {
        title: 'European Creative Hubs Network (ECHN)',
        description: 'Ευρωπαϊκό δίκτυο δημιουργικών κόμβων — coworking, fab labs, incubators.',
        engDescription: 'Network connecting creative hubs — coworking spaces, fab labs, art factories, incubators.',
        url: 'https://creativehubs.eu',
      },
      {
        title: 'Res Artis',
        description: 'Παγκόσμιο δίκτυο καλλιτεχνικών κατοικιών. 700+ κέντρα σε 70+ χώρες.',
        engDescription: 'Worldwide network of over 700 artist residency centres in 70+ countries.',
        url: 'https://www.resartis.org',
      },
      {
        title: 'NEMO — Network of European Museum Organisations',
        description: 'Δίκτυο ευρωπαϊκών οργανώσεων μουσείων. 30.000+ μουσεία.',
        engDescription: 'Network of museum organisations representing over 30,000 museums across Europe.',
        url: 'https://www.ne-mo.org',
      },
      {
        title: 'European Heritage Hub',
        description: 'Κόμβος κοινωνίας πολιτών για πολιτιστική κληρονομιά.',
        engDescription: 'Platform for civil society organisations active in cultural heritage. Facilitates cross-border cooperation and advocacy.',
        url: 'https://www.europeanheritagehub.eu',
      },
      {
        title: 'Placemaking Europe',
        description: 'Δίκτυο σχεδιασμού δημόσιων χώρων με γνώμονα τις κοινότητες.',
        engDescription: 'Network promoting community-driven approaches to designing and managing public spaces.',
        url: 'https://placemaking-europe.eu',
      },
      {
        title: 'Pearle* — Live Performance Europe',
        description: 'Εργοδοτική ομοσπονδία ζωντανών παραστατικών τεχνών. 10.000+ οργανισμοί.',
        engDescription: 'European employers\' federation representing over 10,000 theatres, concert halls, festivals, and live performance organisations.',
        url: 'https://www.pearle.eu',
      },
      {
        title: 'European Festivals Association (EFA)',
        description: 'Ένωση ευρωπαϊκών φεστιβάλ. 100+ φεστιβάλ σε 40 χώρες.',
        engDescription: 'Network of 100+ music, dance, theatre, and multidisciplinary festivals across 40 countries.',
        url: 'https://www.efa-aef.eu',
      },
      {
        title: 'In Situ — Artistic Creation in Public Space',
        description: 'Ευρωπαϊκή πλατφόρμα καλλιτεχνικής δημιουργίας στον δημόσιο χώρο.',
        engDescription: 'Network of 20+ arts organisations commissioning and supporting artistic creation in public space.',
        url: 'https://www.in-situ.info',
      },
      {
        title: 'Green Art Lab Alliance (GALA)',
        description: 'Δίκτυο πράσινης πρακτικής στις τέχνες. 60+ οργανισμοί.',
        engDescription: 'Network of 60+ arts organisations sharing knowledge and resources on sustainability and ecological art practices.',
        url: 'https://greenartlaballiance.eu',
      },
      {
        title: 'Culture Funding Watch',
        description: 'Παρατηρητήριο χρηματοδοτήσεων πολιτισμού στην Ευρώπη.',
        engDescription: 'Platform monitoring and mapping funding opportunities for arts and culture across Europe.',
        url: 'https://www.culturefundingwatch.com',
      },
      {
        title: 'Cyanotypes — Strategic Skills for Creative Futures',
        description: 'Στρατηγικές δεξιότητες για δημιουργικά μέλλοντα. Erasmus+ project (2022–2026).',
        engDescription: 'Erasmus+ Blueprint project with 20+ European partners addressing skills gaps in cultural and creative industries.',
        url: 'https://cyanotypes.website',
      },
      {
        title: 'Tools for Citizens / Civil Society Toolbox',
        description: 'Εργαλειοθήκη κοινωνίας πολιτών — με Έλληνες εταίρους (HIGGS, Impact Hub Athens).',
        engDescription: 'DIY civil society toolbox developed with Greek partners including HIGGS, Impact Hub Athens, and Art of Hosting Athina.',
        url: 'https://civilsocietytoolbox.org',
      },
      {
        title: 'Creative Europe Desks',
        description: 'Εθνικά σημεία επαφής του Creative Europe.',
        engDescription: 'National contact points providing information, advice, and support for Creative Europe applications.',
        url: 'https://culture.ec.europa.eu/resources/creative-europe-desks',
      },
    ],
  },
]
