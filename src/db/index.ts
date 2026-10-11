import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// ─────────────────────────────────────────────────────────────────────────────
// DATABASE CONNECTION
// Uses Neon's serverless HTTP driver — ideal for Next.js serverless functions
// on Vercel (no persistent connection pool needed).
// ─────────────────────────────────────────────────────────────────────────────
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL environment variable is not set. " +
    "Copy .env.example to .env.local and fill in your Neon connection string."
  );
}

const sql = neon(connectionString);
export const db = drizzle(sql, { schema });

export type Database = typeof db;
