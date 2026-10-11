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

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Attach baseline security headers
// ─────────────────────────────────────────────────────────────────────────────
function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // ── CSRF Origin Defense on Mutations ───────────────────────────────────────
  if (["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    const targetHost = request.nextUrl.host;

    if (origin) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== targetHost) {
          return applySecurityHeaders(
            NextResponse.json(
              { error: "Forbidden: Cross-origin request rejected." },
              { status: 403 }
            )
          );
        }
      } catch {
        return applySecurityHeaders(
          NextResponse.json(
            { error: "Forbidden: Malformed origin header." },
            { status: 403 }
          )
        );
      }
    } else if (referer) {
      try {
        const refererHost = new URL(referer).host;
        if (refererHost !== targetHost) {
          return applySecurityHeaders(
            NextResponse.json(
              { error: "Forbidden: Cross-origin referer rejected." },
              { status: 403 }
            )
          );
        }
      } catch {
        return applySecurityHeaders(
          NextResponse.json(
            { error: "Forbidden: Malformed referer header." },
            { status: 403 }
          )
        );
      }
    }
  }

  // ── API Route Guards ───────────────────────────────────────────────────────
  if (pathname.startsWith("/api/admin/")) {
    const token = request.cookies.get(COOKIE_ADMIN)?.value;
    if (!token) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Unauthorized: Admin session required." },
          { status: 401 }
        )
      );
    }
    const session = await verifyToken(token);
    if (!session || (session as { role?: string }).role !== "admin") {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Unauthorized: Invalid admin token." },
          { status: 401 }
        )
      );
    }
  }

  if (pathname.startsWith("/api/export/")) {
    const smcToken = request.cookies.get(COOKIE_SMC)?.value;
    const adminToken = request.cookies.get(COOKIE_ADMIN)?.value;

    let authorized = false;
    if (adminToken) {
      const adminSession = await verifyToken(adminToken);
      if (adminSession && (adminSession as { role?: string }).role === "admin") {
        authorized = true;
      }
    }
    if (!authorized && smcToken) {
      const smcSession = await verifyToken(smcToken);
      if (smcSession && (smcSession as { role?: string }).role === "smc") {
        authorized = true;
      }
    }

    if (!authorized) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Unauthorized: SMC or Admin session required." },
          { status: 401 }
        )
      );
    }
  }

  // ── Boarder routes ─────────────────────────────────────────────────────────
  if (pathname === "/" || BOARDER_PROTECTED.some((p) => pathname === p)) {
    const token = request.cookies.get(COOKIE_BOARDER)?.value;
    if (!token) {
      return applySecurityHeaders(
        NextResponse.redirect(new URL("/login", request.url))
      );
    }
    const session = await verifyToken(token);
    if (!session || (session as { role?: string }).role !== "boarder") {
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete(COOKIE_BOARDER);
      return applySecurityHeaders(response);
    }
  }

  if (BOARDER_AUTH_ROUTES.some((p) => pathname === p)) {
    const token = request.cookies.get(COOKIE_BOARDER)?.value;
    if (token) {
      const session = await verifyToken(token);
      if (session && (session as { role?: string }).role === "boarder") {
        return applySecurityHeaders(
          NextResponse.redirect(new URL("/", request.url))
        );
      }
    }
  }

  // ── SMC routes ─────────────────────────────────────────────────────────────
  if (SMC_PROTECTED.some((p) => pathname.startsWith(p))) {
    const token = request.cookies.get(COOKIE_SMC)?.value;
    if (!token) {
      return applySecurityHeaders(
        NextResponse.redirect(new URL("/smc", request.url))
      );
    }
    const session = await verifyToken(token);
    if (!session || (session as { role?: string }).role !== "smc") {
      const response = NextResponse.redirect(new URL("/smc", request.url));
      response.cookies.delete(COOKIE_SMC);
      return applySecurityHeaders(response);
    }
  }

  // ── Admin routes ───────────────────────────────────────────────────────────
  if (
    pathname === "/admin" ||
    (pathname.startsWith("/admin/") && pathname !== "/admin/login")
  ) {
    const token = request.cookies.get(COOKIE_ADMIN)?.value;
    if (!token) {
      return applySecurityHeaders(
        NextResponse.redirect(new URL("/admin/login", request.url))
      );
    }
    const session = await verifyToken(token);
    if (!session || (session as { role?: string }).role !== "admin") {
      const response = NextResponse.redirect(new URL("/admin/login", request.url));
      response.cookies.delete(COOKIE_ADMIN);
      return applySecurityHeaders(response);
    }
  }

  if (pathname === "/admin/login") {
    const token = request.cookies.get(COOKIE_ADMIN)?.value;
    if (token) {
      const session = await verifyToken(token);
      if (session && (session as { role?: string }).role === "admin") {
        return applySecurityHeaders(
          NextResponse.redirect(new URL("/admin", request.url))
        );
      }
    }
  }

  return applySecurityHeaders(NextResponse.next());
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG — match all guarded pages and protected APIs
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
    "/api/admin/:path*",
    "/api/export/:path*",
  ],
};
