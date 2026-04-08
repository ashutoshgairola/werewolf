import { Pool } from 'pg'
import { logger } from '../shared/logger'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required')
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected error on idle pg client')
})
