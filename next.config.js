/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
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
    ],
  },
}

module.exports = nextConfig
