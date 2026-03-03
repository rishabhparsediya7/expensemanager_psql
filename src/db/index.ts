import { drizzle } from "drizzle-orm/node-postgres"
import pg from "pg"
const { Pool } = pg

import * as schema from "./schema"
import dotenv from "dotenv"

dotenv.config()

// Create PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false,
  },
})

// Create Drizzle instance with schema
export const db = drizzle(pool, { schema })

// Export types
export type DB = typeof db
export { schema }
