import { config as loadEnv } from 'dotenv'
import { resolve } from 'path'

loadEnv({ path: resolve(__dirname, '../../.env.local') })

// @ts-expect-error - NODE_ENV is readonly in Next.js types but jest runs need it set
process.env.NODE_ENV = 'test'
