/**
 * Jose JWT session management.
 * Handles signing, verifying, and cookie management for
 * Boarder (14-day), SMC (7-day), and Admin (24h) sessions.
 */
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";

// ─────────────────────────────────────────────────────────────────────────────
// SECRET KEY
// ─────────────────────────────────────────────────────────────────────────────
function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET environment variable is not set.");
    }
    // Development fallback — NOT safe for production
    console.warn(
      "[auth] JWT_SECRET not set. Using insecure development secret."
    );
    return new TextEncoder().encode(
      "dev-only-insecure-secret-replace-in-production"
    );
  }
  return new TextEncoder().encode(secret);
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSION PAYLOAD TYPES
// ─────────────────────────────────────────────────────────────────────────────
export interface BoarderSession extends JWTPayload {
  role: "boarder";
  studentId: number;
  rollNumber: string;
  name: string;
  block: string;
  roomNumber: string;
  blockRoom: string; // e.g. "A-214"
}

export interface SmcSession extends JWTPayload {
  role: "smc";
  smcUserId: number;
  rollNumber: string;
}

export interface AdminSession extends JWTPayload {
  role: "admin";
  adminId: number;
  username: string;
  isSuperAdmin: boolean;
}

export type AnySession = BoarderSession | SmcSession | AdminSession;

// ─────────────────────────────────────────────────────────────────────────────
// COOKIE NAMES
// ─────────────────────────────────────────────────────────────────────────────
export const COOKIE_BOARDER = "boarder_session";
export const COOKIE_SMC = "smc_session";
export const COOKIE_ADMIN = "admin_session";

// ─────────────────────────────────────────────────────────────────────────────
// EXPIRY CONSTANTS (seconds)
// ─────────────────────────────────────────────────────────────────────────────
export const BOARDER_SESSION_TTL = 14 * 24 * 60 * 60; // 14 days, non-sliding
export const SMC_SESSION_TTL = 7 * 24 * 60 * 60;      // 7 days
export const ADMIN_SESSION_TTL = 24 * 60 * 60;         // 24 hours

// ─────────────────────────────────────────────────────────────────────────────
// SIGN TOKEN
// ─────────────────────────────────────────────────────────────────────────────
export async function signToken(
  payload: Record<string, unknown>,
  ttlSeconds: number = 7 * 24 * 60 * 60
): Promise<string> {
  const key = getSecretKey();
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + ttlSeconds)
    .sign(key);
}


// ─────────────────────────────────────────────────────────────────────────────
// VERIFY TOKEN
// ─────────────────────────────────────────────────────────────────────────────
export async function verifyToken<T extends JWTPayload>(
  token: string
): Promise<T | null> {
  try {
    const key = getSecretKey();
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });
    return payload as T;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COOKIE HELPERS (Server Components / Server Actions)
// ─────────────────────────────────────────────────────────────────────────────
const isProduction = process.env.NODE_ENV === "production";

export async function setSessionCookie(
  name: string,
  token: string,
  maxAgeSeconds: number
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(name, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function clearSessionCookie(name: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(name, "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getSession<T extends JWTPayload>(
  cookieName: string,
  tokenOverride?: string
): Promise<T | null> {
  if (tokenOverride) {
    return verifyToken<T>(tokenOverride);
  }
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(cookieName)?.value;
    if (!token) return null;
    return verifyToken<T>(token);
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONVENIENCE GETTERS
// ─────────────────────────────────────────────────────────────────────────────
export async function getBoarderSession(tokenOverride?: string): Promise<BoarderSession | null> {
  return getSession<BoarderSession>(COOKIE_BOARDER, tokenOverride);
}

export async function getSmcSession(tokenOverride?: string): Promise<SmcSession | null> {
  return getSession<SmcSession>(COOKIE_SMC, tokenOverride);
}

export async function getAdminSession(tokenOverride?: string): Promise<AdminSession | null> {
  return getSession<AdminSession>(COOKIE_ADMIN, tokenOverride);
}

