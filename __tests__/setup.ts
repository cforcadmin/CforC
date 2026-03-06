// Test environment variables
process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests-only'
process.env.STRAPI_URL = 'http://localhost:1337'
process.env.STRAPI_API_TOKEN = 'test-strapi-token'
process.env.RESEND_API_KEY = 'test-resend-key'
process.env.CRON_SECRET = 'test-cron-secret'
process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000'
process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000'
process.env.NODE_ENV = 'test'
