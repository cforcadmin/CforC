/** @type {import('next').NextConfig} */
const nextConfig = {
  // VERIFY_BUILD=1 npm run build → χτίζει σε χωριστό φάκελο ώστε να μην
  // πατά το .next του dev server (που μετά σερβίρει μπαγιάτικο κώδικα).
  // Το hook του project μπλοκάρει το σκέτο build όσο τρέχει dev server
  // και δείχνει εδώ.
  distDir: process.env.VERIFY_BUILD ? '.next-verify' : '.next',
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
        hostname: 'faithful-crystal-a2269c9fd9.strapiapp.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'faithful-crystal-a2269c9fd9.media.strapiapp.com',
        pathname: '/**',
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
