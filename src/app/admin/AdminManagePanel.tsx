"use client";

import { useActionState } from "react";
import {
  createSecondaryAdminAction,
  deactivateAdminAction,
  type AdminActionState,
} from "@/actions/admin-auth";
import type { Admin } from "@/db/schema";

interface AdminManagePanelProps {
  admins: Admin[];
  isSuperAdmin: boolean;
  currentAdminId: number;
}

const initialState: AdminActionState = {};

export function AdminManagePanel({
  admins,
  isSuperAdmin,
  currentAdminId,
}: AdminManagePanelProps) {
  const [createState, createAction, isCreating] = useActionState(
    createSecondaryAdminAction,
    initialState
  );

  const activeCount = admins.filter((a) => a.isActive).length;
  const canAddSecondary = isSuperAdmin && activeCount < 3;

  return (
    <div className="card" style={{ marginTop: "24px", padding: "16px 20px" }}>
      <div
        style={{
          fontSize: "1rem",
          fontWeight: "bold",
          marginBottom: "12px",
          paddingBottom: "8px",
          borderBottom: "var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span>ADMINISTRATOR ACCOUNTS ({activeCount}/3 ACTIVE)</span>
        <span style={{ fontSize: "0.8rem", color: "#767676", fontWeight: "normal" }}>
          MAX 1 SUPER ADMIN + 2 SECONDARY ADMINS
        </span>
      </div>

      {/* ── Admin Accounts Table ────────────────────────────────────── */}
      <div style={{ overflowX: "auto", marginBottom: "20px" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.85rem",
          }}
        >
          <thead>
            <tr style={{ borderBottom: "var(--border)", textAlign: "left" }}>
              <th style={{ padding: "8px 6px" }}>ID</th>
              <th style={{ padding: "8px 6px" }}>USERNAME</th>
              <th style={{ padding: "8px 6px" }}>ROLE</th>
              <th style={{ padding: "8px 6px" }}>STATUS</th>
              <th style={{ padding: "8px 6px", textAlign: "right" }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => (
              <tr
                key={admin.id}
                style={{
                  borderBottom: "1px solid #333333",
                  backgroundColor: admin.isActive ? "transparent" : "#111111",
                }}
              >
                <td style={{ padding: "8px 6px" }}>#{admin.id}</td>
                <td style={{ padding: "8px 6px" }}>
                  <strong>{admin.username}</strong>
                  {admin.id === currentAdminId && (
                    <span style={{ color: "#767676", marginLeft: "6px" }}>(you)</span>
                  )}
                </td>
                <td style={{ padding: "8px 6px" }}>
                  {admin.isSuperAdmin ? (
                    <span
                      style={{
                        border: "1px solid var(--fg)",
                        padding: "1px 6px",
                        fontSize: "0.75rem",
                        fontWeight: "bold",
                      }}
                    >
                      SUPER ADMIN
                    </span>
                  ) : (
                    <span>SECONDARY</span>
                  )}
                </td>
                <td style={{ padding: "8px 6px" }}>
                  {admin.isActive ? (
                    <span style={{ color: "var(--fg)" }}>[ACTIVE]</span>
                  ) : (
                    <span style={{ color: "#767676" }}>[DEACTIVATED]</span>
                  )}
                </td>
                <td style={{ padding: "8px 6px", textAlign: "right" }}>
                  {isSuperAdmin && !admin.isSuperAdmin && admin.isActive && (
                    <form action={deactivateAdminAction} style={{ display: "inline" }}>
                      <input type="hidden" name="adminId" value={admin.id} />
                      <button
                        type="submit"
                        className="btn btn-outline"
                        style={{
                          minHeight: "28px",
                          padding: "2px 8px",
                          fontSize: "0.75rem",
                          width: "auto",
                        }}
                      >
                        DEACTIVATE
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Provision Secondary Admin Form ─────────────────────────── */}
      {isSuperAdmin && (
        <div
          style={{
            borderTop: "var(--border)",
            paddingTop: "16px",
          }}
        >
          <div
            style={{
              fontSize: "0.9rem",
              fontWeight: "bold",
              marginBottom: "10px",
            }}
          >
            PROVISION SECONDARY ADMIN
          </div>

          {!canAddSecondary ? (
            <div style={{ color: "#767676", fontSize: "0.85rem" }}>
              [ADMIN CAPACITY REACHED — MAXIMUM 3 ACTIVE ADMINS PERMITTED]
            </div>
          ) : (
            <form action={createAction} className="form" style={{ maxWidth: "400px" }}>
              {createState.error && (
                <div className="alert alert-error">
                  {createState.error}
                </div>
              )}
              {createState.success && (
                <div className="alert alert-success">
                  Secondary admin created successfully.
                </div>
              )}

              <div className="field">
                <label htmlFor="sec-username">NEW ADMIN USERNAME</label>
                <input
                  id="sec-username"
                  name="username"
                  type="text"
                  required
                  placeholder="e.g. warden_manas"
                />
              </div>

              <div className="field">
                <label htmlFor="sec-password">PASSWORD</label>
                <input
                  id="sec-password"
                  name="password"
                  type="password"
                  required
                  placeholder="Min 6 characters"
                />
              </div>

              <button
                type="submit"
                className="btn"
                disabled={isCreating}
                style={{ width: "auto", minHeight: "36px", padding: "6px 16px" }}
              >
                {isCreating ? "CREATING..." : "+ CREATE SECONDARY ADMIN"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
