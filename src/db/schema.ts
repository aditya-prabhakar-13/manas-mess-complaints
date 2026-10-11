import { pgTable, serial, varchar, integer, boolean, text, timestamp } from "drizzle-orm/pg-core";

// ─────────────────────────────────────────────────────────────────────────────
// STUDENTS (roster)
// ─────────────────────────────────────────────────────────────────────────────
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  rollNumber: varchar("roll_number", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  block: varchar("block", { length: 1 }).notNull(), // A, B, C, D
  roomNumber: varchar("room_number", { length: 20 }).notNull(),
  course: varchar("course", { length: 100 }).notNull(),
  yearOfJoining: integer("year_of_joining").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPLAINTS
// Stores snapshots of student data at submission time so later roster
// changes do not alter historical complaints.
// ─────────────────────────────────────────────────────────────────────────────
export const complaints = pgTable("complaints", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id),
  rollNumber: varchar("roll_number", { length: 50 }).notNull(),
  // Immutable snapshot fields
  nameSnapshot: varchar("name_snapshot", { length: 255 }).notNull(),
  courseSnapshot: varchar("course_snapshot", { length: 100 }).notNull(),
  yearOfStudySnapshot: varchar("year_of_study_snapshot", { length: 20 }).notNull(), // e.g. "3rd Year"
  blockRoomSnapshot: varchar("block_room_snapshot", { length: 20 }).notNull(), // e.g. "A-214"
  // Complaint data
  meal: varchar("meal", { length: 20 }).notNull(), // 'breakfast' | 'lunch' | 'dinner' | 'gala_dinner'
  complaintText: text("complaint_text").notNull(),
  // Soft delete
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  deletedBy: varchar("deleted_by", { length: 100 }),
  deletedReason: text("deleted_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─────────────────────────────────────────────────────────────────────────────
// SMC USERS
// ─────────────────────────────────────────────────────────────────────────────
export const smcUsers = pgTable("smc_users", {
  id: serial("id").primaryKey(),
  rollNumber: varchar("roll_number", { length: 50 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMINS
// ─────────────────────────────────────────────────────────────────────────────
export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  isSuperAdmin: boolean("is_super_admin").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─────────────────────────────────────────────────────────────────────────────
// GALA DINNER DATES
// Admin-configured dates when Gala Dinner replaces Dinner.
// Stored as 'YYYY-MM-DD' strings in IST.
// ─────────────────────────────────────────────────────────────────────────────
export const galaDates = pgTable("gala_dates", {
  id: serial("id").primaryKey(),
  galaDate: varchar("gala_date", { length: 10 }).notNull().unique(), // 'YYYY-MM-DD' IST
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN ATTEMPTS
// Immutable audit log of all authentication attempts (boarder, SMC, admin).
// Used for rate limiting and lockout enforcement.
// ─────────────────────────────────────────────────────────────────────────────
export const loginAttempts = pgTable("login_attempts", {
  id: serial("id").primaryKey(),
  identifier: varchar("identifier", { length: 100 }).notNull(), // roll_number or username
  ipAddress: varchar("ip_address", { length: 45 }).notNull(),   // supports IPv6
  userAgent: text("user_agent"),
  outcome: varchar("outcome", { length: 20 }).notNull(),        // 'success' | 'failure' | 'lockout'
  userType: varchar("user_type", { length: 20 }).notNull().default("boarder"), // 'boarder' | 'smc' | 'admin'
  attemptedAt: timestamp("attempted_at").notNull().defaultNow(),
});

// ─────────────────────────────────────────────────────────────────────────────
// SUBMISSION LOG
// Log of all complaint submission attempts with outcome.
// ─────────────────────────────────────────────────────────────────────────────
export const submissionLog = pgTable("submission_log", {
  id: serial("id").primaryKey(),
  rollNumber: varchar("roll_number", { length: 50 }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }).notNull(),
  userAgent: text("user_agent"),
  meal: varchar("meal", { length: 20 }),
  outcome: varchar("outcome", { length: 50 }).notNull(), // 'success' | 'rate_limit_meal' | 'rate_limit_day' | 'rate_limit_ip' | 'duplicate' | 'honeypot' | 'validation_error'
  attemptedAt: timestamp("attempted_at").notNull().defaultNow(),
});

// ─────────────────────────────────────────────────────────────────────────────
// LOCKOUTS
// Active lockout records for roll numbers and IPs.
// A lockout exists if locked_until > NOW().
// ─────────────────────────────────────────────────────────────────────────────
export const lockouts = pgTable("lockouts", {
  id: serial("id").primaryKey(),
  keyType: varchar("key_type", { length: 20 }).notNull(), // 'roll_number' | 'ip'
  keyValue: varchar("key_value", { length: 100 }).notNull(),
  lockedUntil: timestamp("locked_until").notNull(),
  reason: varchar("reason", { length: 50 }).notNull().default("login_failures"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOG
// Immutable record of all administrative actions.
// ─────────────────────────────────────────────────────────────────────────────
export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  actorType: varchar("actor_type", { length: 20 }).notNull(), // 'admin' | 'system'
  actorId: varchar("actor_id", { length: 100 }).notNull(),    // username
  action: varchar("action", { length: 100 }).notNull(),       // e.g. 'delete_complaint', 'create_smc_user'
  targetType: varchar("target_type", { length: 50 }),         // e.g. 'complaint', 'smc_user', 'roster'
  targetId: varchar("target_id", { length: 100 }),
  details: text("details"),                                    // JSON string with additional context
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Export all table types for use in queries
export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
export type Complaint = typeof complaints.$inferSelect;
export type NewComplaint = typeof complaints.$inferInsert;
export type SmcUser = typeof smcUsers.$inferSelect;
export type Admin = typeof admins.$inferSelect;
export type GalaDate = typeof galaDates.$inferSelect;
export type LoginAttempt = typeof loginAttempts.$inferSelect;
export type SubmissionLogEntry = typeof submissionLog.$inferSelect;
export type Lockout = typeof lockouts.$inferSelect;
export type AuditLogEntry = typeof auditLog.$inferSelect;
