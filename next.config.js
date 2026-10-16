/** @type {import('next').NextConfig} */
const nextConfig = {
  // VERIFY_BUILD=1 npm run build → χτίζει σε χωριστό φάκελο ώστε να μην
  // πατά το .next του dev server (που μετά σερβίρει μπαγιάτικο κώδικα).
  // Το hook του project μπλοκάρει το σκέτο build όσο τρέχει dev server
  // και δείχνει εδώ.
  distDir: process.env.VERIFY_BUILD ? '.next-verify' : '.next',

  /**
   * STRICT MODE ΣΒΗΣΤΟ ΟΣΟ ΤΟ ΟΡΙΟ ΤΟΥ STRAPI ΕΙΝΑΙ ΣΦΙΧΤΟ.
   *
   * Το StrictMode καλεί ΔΥΟ φορές κάθε effect στην ανάπτυξη — χρήσιμο για να
   * πιάνονται ακάθαρτα effects, αλλά σημαίνει ότι κάθε οθόνη του OC ζητά τα
   * δεδομένα της δύο φορές. Μετρημένο 16/10/2026: 188 κλήσεις σε 8 λεπτά,
   * με κάθε endpoint να εμφανίζεται δύο φορές στο log.
   *
   * Στην ΠΑΡΑΓΩΓΗ δεν διπλασιάζει ποτέ, άρα αυτό αλλάζει μόνο τη δική μας
   * κατανάλωση. Με 3.100 κλήσεις να απομένουν ως την 1η Νοεμβρίου, η μισή
   * ανάπτυξη αξίζει περισσότερο από τον διπλό έλεγχο για δύο εβδομάδες.
   *
   * ΝΑ ΞΑΝΑΝΑΨΕΙ ΜΕΤΑ ΤΗΝ ΑΝΑΝΕΩΣΗ ΤΟΥ ΟΡΙΟΥ: σβήνει έναν πραγματικό
   * μηχανισμό ασφαλείας, δεν είναι μόνιμη βελτίωση.
   */
  reactStrictMode: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
  async redirects() {
    return [
      // Redirect old Webflow /en paths to new site
      {
        source: '/en',
        destination: '/',
        permanent: true,
      },
      {
        source: '/en/:path*',
        destination: '/:path*',
        permanent: true,
      },
    ]
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '1337',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'localhost',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'helpful-wealth-0a46a9eabb.strapiapp.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'helpful-wealth-0a46a9eabb.media.strapiapp.com',
        pathname: '/**',
      },
    ],
  },
}

module.exports = nextConfig
