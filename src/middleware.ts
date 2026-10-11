import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import {
  COOKIE_BOARDER,
  COOKIE_SMC,
  COOKIE_ADMIN,
} from "@/lib/auth";

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE MATCHERS
// ─────────────────────────────────────────────────────────────────────────────
const BOARDER_PROTECTED = ["/", "/done"];
const BOARDER_AUTH_ROUTES = ["/login"];

const SMC_PROTECTED = ["/smc/complaints", "/smc/archive"];
const SMC_AUTH_ROUTES = ["/smc"];

const ADMIN_PROTECTED = ["/admin/dashboard", "/admin/roster", "/admin/smc", "/admin/gala", "/admin/complaints", "/admin/logs", "/admin/export", "/admin/qr"];
const ADMIN_AUTH_ROUTES = ["/admin/login"];

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Boarder routes ─────────────────────────────────────────────────────────
  if (pathname === "/" || BOARDER_PROTECTED.some((p) => pathname === p)) {
    const token = request.cookies.get(COOKIE_BOARDER)?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    const session = await verifyToken(token);
    if (!session || (session as { role?: string }).role !== "boarder") {
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete(COOKIE_BOARDER);
      return response;
    }
  }

  if (BOARDER_AUTH_ROUTES.some((p) => pathname === p)) {
    const token = request.cookies.get(COOKIE_BOARDER)?.value;
    if (token) {
      const session = await verifyToken(token);
      if (session && (session as { role?: string }).role === "boarder") {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
  }

  // ── SMC routes ─────────────────────────────────────────────────────────────
  if (SMC_PROTECTED.some((p) => pathname.startsWith(p))) {
    const token = request.cookies.get(COOKIE_SMC)?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/smc", request.url));
    }
    const session = await verifyToken(token);
    if (!session || (session as { role?: string }).role !== "smc") {
      const response = NextResponse.redirect(new URL("/smc", request.url));
      response.cookies.delete(COOKIE_SMC);
      return response;
    }
  }

  // ── Admin routes ───────────────────────────────────────────────────────────
  if (ADMIN_PROTECTED.some((p) => pathname.startsWith(p))) {
    const token = request.cookies.get(COOKIE_ADMIN)?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    const session = await verifyToken(token);
    if (!session || (session as { role?: string }).role !== "admin") {
      const response = NextResponse.redirect(new URL("/admin/login", request.url));
      response.cookies.delete(COOKIE_ADMIN);
      return response;
    }
  }

  return NextResponse.next();
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG — only run middleware on matching routes
// ─────────────────────────────────────────────────────────────────────────────
export const config = {
  matcher: [
    "/",
    "/login",
    "/done",
    "/smc",
    "/smc/:path*",
    "/admin",
    "/admin/:path*",
  ],
};
