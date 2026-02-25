/** @type {import('next').NextConfig} */
const nextConfig = {
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
