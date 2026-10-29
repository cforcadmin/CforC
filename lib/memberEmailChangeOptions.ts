/**
 * Πώς ζητήθηκε η αλλαγή email μέλους — κοινή λίστα για το κουτί του OC
 * (client) και τη διαδρομή /api/oc/members/email (server). Χωρίς imports και
 * χωρίς env: εισάγεται και από client component. Το «Άλλο» θέλει λεπτομέρεια.
 */
export const EMAIL_CHANGE_REQUEST_SOURCES = [
  'Αίτηση μέσω email σε it@',
  'Αίτηση μέσω email σε hello@',
  'Αίτηση μέσω email σε community@',
  'Αίτηση τηλεφωνική σε it@',
  'Αίτηση τηλεφωνική σε hello@',
  'Αίτηση τηλεφωνική σε community@',
  'Άλλο',
] as const
