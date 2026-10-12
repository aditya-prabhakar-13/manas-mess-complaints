/**
 * Database seed script.
 * Run with: npm run db:seed
 * Requires DATABASE_URL in .env.local
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as bcrypt from "bcryptjs";
import * as schema from "./schema";

const SALT_ROUNDS = 12;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL not set. Create .env.local first.");
  }

  const sql = neon(connectionString);
  const db = drizzle(sql, { schema });

  console.log("🌱 Seeding database...\n");

  // ── SUPER ADMIN ──────────────────────────────────────────────────────────
  const superAdminUsername = process.env.SUPER_ADMIN_USERNAME || "admin";
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;
  if (!superAdminPassword) {
    throw new Error("SUPER_ADMIN_PASSWORD not set in environment.");
  }
  const superAdminHash = await bcrypt.hash(superAdminPassword, SALT_ROUNDS);

  await db
    .insert(schema.admins)
    .values({
      username: superAdminUsername,
      passwordHash: superAdminHash,
      isSuperAdmin: true,
      isActive: true,
    })
    .onConflictDoNothing();
  console.log(`✅ Super admin: ${superAdminUsername}`);

  // ── SAMPLE STUDENTS ──────────────────────────────────────────────────────
  const sampleStudents: schema.NewStudent[] = [
    { rollNumber: "240101001", name: "Arjun Sharma", block: "A", roomNumber: "214", course: "B.Tech CSE", yearOfJoining: 2024 },
    { rollNumber: "240101002", name: "Priya Nair", block: "B", roomNumber: "108", course: "B.Tech EE", yearOfJoining: 2024 },
    { rollNumber: "230101001", name: "Rahul Singh", block: "C", roomNumber: "312", course: "B.Tech ME", yearOfJoining: 2023 },
    { rollNumber: "220101001", name: "Sneha Patel", block: "D", roomNumber: "405", course: "M.Tech CSE", yearOfJoining: 2022 },
    { rollNumber: "210101001", name: "Vikram Mehta", block: "A", roomNumber: "118", course: "B.Tech CE", yearOfJoining: 2021 },
  ];

  for (const student of sampleStudents) {
    await db
      .insert(schema.students)
      .values(student)
      .onConflictDoNothing();
    console.log(`✅ Student: ${student.rollNumber} — ${student.name} (Block ${student.block}-${student.roomNumber})`);
  }

  // ── SAMPLE SMC USER ──────────────────────────────────────────────────────
  const smcPassword = "smc@Manas2026";
  const smcHash = await bcrypt.hash(smcPassword, SALT_ROUNDS);
  await db
    .insert(schema.smcUsers)
    .values({
      rollNumber: "SMC2026001",
      passwordHash: smcHash,
      isActive: true,
    })
    .onConflictDoNothing();
  console.log(`✅ SMC user: SMC2026001 (password: ${smcPassword})`);

  // ── SAMPLE GALA DATE ─────────────────────────────────────────────────────
  // Add today's date as a Gala Dinner test date
  const today = new Date();
  const todayIST = new Date(today.getTime() + (5.5 * 60 * 60 * 1000));
  const todayStr = todayIST.toISOString().split("T")[0]; // YYYY-MM-DD
  await db
    .insert(schema.galaDates)
    .values({
      galaDate: todayStr,
      description: "Sample Gala Dinner (seed data)",
    })
    .onConflictDoNothing();
  console.log(`✅ Gala date: ${todayStr} (today, for testing)`);

  console.log("\n🎉 Seed complete!");
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
