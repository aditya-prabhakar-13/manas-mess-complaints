import Link from "next/link";
import { logoutAdminAction } from "@/actions/admin-auth";
import type { AdminSession } from "@/lib/auth";

interface AdminNavProps {
  currentPath?: string;
  session: AdminSession;
}

const NAV_ITEMS = [
  { href: "/admin", label: "DASHBOARD" },
  { href: "/admin/roster", label: "ROSTER" },
  { href: "/admin/smc", label: "SMC ACCOUNTS" },
  { href: "/admin/gala", label: "GALA DATES" },
  { href: "/admin/complaints", label: "COMPLAINTS" },
  { href: "/admin/logs", label: "LOGS & LOCKOUTS" },
  { href: "/admin/export", label: "EXPORTS" },
  { href: "/admin/qr", label: "TABLE QR" },
];

export function AdminNav({ currentPath = "/admin", session }: AdminNavProps) {
  return (
    <div
      className="card"
      style={{
        padding: "10px 14px",
        marginBottom: "20px",
        backgroundColor: "var(--bg)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          borderBottom: "var(--border)",
          paddingBottom: "10px",
          marginBottom: "10px",
        }}
      >
        <div style={{ fontSize: "0.9rem" }}>
          <span>ADMIN: </span>
          <strong>{session.username}</strong>
          {session.isSuperAdmin && (
            <span
              style={{
                marginLeft: "8px",
                border: "1px solid currentColor",
                padding: "1px 6px",
                fontSize: "0.75rem",
                fontWeight: "bold",
              }}
            >
              SUPER ADMIN
            </span>
          )}
        </div>

        <form action={logoutAdminAction} style={{ width: "auto" }}>
          <button
            type="submit"
            className="btn btn-outline"
            style={{
              minHeight: "32px",
              padding: "4px 12px",
              fontSize: "0.8rem",
              width: "auto",
            }}
          >
            LOG OUT
          </button>
        </form>
      </div>

      <nav
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "6px",
        }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = currentPath === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="btn btn-outline"
              style={{
                padding: "6px 12px",
                fontSize: "0.8rem",
                width: "auto",
                minHeight: "34px",
                textDecoration: "none",
                backgroundColor: isActive ? "var(--fg)" : "var(--bg)",
                color: isActive ? "var(--bg)" : "var(--fg)",
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
