// Shared constants for OC preferences.
// Preferences are stored SERVER-SIDE in httpOnly cookies (set via
// /api/oc/prefs) because client storage (localStorage) proved unreliable —
// content blockers/private modes wipe it. Cookie names below are read by
// server code (app/oc/page.tsx, /api/oc/me) only.

// 'members' | 'oc' — absent means "ask each time"
export const OC_LANDING_COOKIE = 'oc-landing'
// last seat a multi-seat member worked as — lets logins enter silently
export const OC_LAST_SEAT_COOKIE = 'oc-last-seat'

export const OC_SEAT_LABELS: Record<string, string> = {
  coordinator: 'Συντονισμός',
  admin: 'Γραμματεία',
  comms: 'Επικοινωνία',
  it: 'IT',
  community: 'Κοινότητα',
  financer: 'Οικονομικά',
  outreach: 'Outreach',
}

// Short seat codes for the compact hero bubble
export const OC_SEAT_SHORT: Record<string, string> = {
  coordinator: 'C',
  admin: 'A',
  comms: 'Coms',
  it: 'IT',
  community: 'CM',
  financer: 'F',
  outreach: 'VC',
}
