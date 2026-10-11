import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// ─────────────────────────────────────────────────────────────────────────────
// DATABASE CONNECTION
// Uses Neon's serverless HTTP driver — ideal for Next.js serverless functions
// on Vercel (no persistent connection pool needed).
// ─────────────────────────────────────────────────────────────────────────────
const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://placeholder:placeholder@ep-mock.us-east-1.aws.neon.tech/neondb?sslmode=require";

if (!process.env.DATABASE_URL && process.env.NODE_ENV === "production") {
  throw new Error(
    "DATABASE_URL environment variable is not set. " +
    "Please configure DATABASE_URL in your production environment."
  );
}

const sql = neon(connectionString);
export const db = drizzle(sql, { schema });

export type Database = typeof db;
