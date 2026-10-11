"use client";

import { useActionState, useState } from "react";
import type { SmcUser } from "@/db/schema";
import { formatISTDateTime } from "@/lib/date-utils";
import {
  resetSmcPasswordAction,
  toggleSmcStatusAction,
  type SmcManageState,
} from "@/actions/smc-manage";

interface SmcManageListProps {
  users: SmcUser[];
}

const initialState: SmcManageState = {};

export function SmcManageList({ users }: SmcManageListProps) {
  const [resetState, resetAction, isResetting] = useActionState(
    resetSmcPasswordAction,
    initialState
  );
  const [copied, setCopied] = useState(false);

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="card" style={{ padding: "16px 20px" }}>
      <div
        style={{
          fontSize: "1rem",
          fontWeight: "bold",
          marginBottom: "12px",
          paddingBottom: "8px",
          borderBottom: "var(--border)",
        }}
      >
        EXISTING SMC ACCOUNTS ({users.length})
      </div>

      {resetState.success && resetState.generatedPassword && (
        <div
          style={{
            border: "2px solid var(--fg)",
            padding: "14px 16px",
            backgroundColor: "#0d0d0d",
            marginBottom: "16px",
          }}
        >
          <div style={{ fontSize: "0.85rem", color: "#767676", marginBottom: "4px" }}>
            PASSWORD RESET SUCCESSFUL FOR: <strong>{resetState.rollNumber}</strong>
          </div>
          <div style={{ fontSize: "0.85rem", marginBottom: "6px" }}>
            NEW ONE-TIME TEMPORARY PASSWORD:
          </div>
          <div
            style={{
              fontSize: "1.3rem",
              fontWeight: "bold",
              letterSpacing: "0.1em",
              padding: "6px 10px",
              border: "1px dashed var(--fg)",
              marginBottom: "8px",
            }}
          >
            {resetState.generatedPassword}
          </div>
          <button
            type="button"
            onClick={() => handleCopy(resetState.generatedPassword!)}
            className="btn btn-outline"
            style={{ width: "auto", padding: "4px 12px", fontSize: "0.8rem" }}
          >
            {copied ? "COPIED!" : "COPY PASSWORD"}
          </button>
        </div>
      )}

      {users.length === 0 ? (
        <div style={{ padding: "30px 0", textAlign: "center", color: "#767676" }}>
          [NO SMC ACCOUNTS PROVISIONED YET]
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.85rem",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "var(--border)", textAlign: "left" }}>
                <th style={{ padding: "8px 6px" }}>ROLL NO</th>
                <th style={{ padding: "8px 6px" }}>CREATED (IST)</th>
                <th style={{ padding: "8px 6px" }}>STATUS</th>
                <th style={{ padding: "8px 6px", textAlign: "right" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  style={{
                    borderBottom: "1px solid #222222",
                    backgroundColor: u.isActive ? "transparent" : "#111111",
                  }}
                >
                  <td style={{ padding: "8px 6px" }}>
                    <strong>{u.rollNumber}</strong>
                  </td>
                  <td style={{ padding: "8px 6px", color: "#767676" }}>
                    {formatISTDateTime(u.createdAt)}
                  </td>
                  <td style={{ padding: "8px 6px" }}>
                    {u.isActive ? (
                      <span style={{ color: "var(--fg)" }}>ACTIVE</span>
                    ) : (
                      <span style={{ color: "#767676" }}>DEACTIVATED</span>
                    )}
                  </td>
                  <td
                    style={{
                      padding: "8px 6px",
                      textAlign: "right",
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: "6px",
                    }}
                  >
                    <form action={resetAction} style={{ display: "inline" }}>
                      <input type="hidden" name="userId" value={u.id} />
                      <button
                        type="submit"
                        disabled={isResetting}
                        className="btn btn-outline"
                        style={{
                          minHeight: "26px",
                          padding: "2px 8px",
                          fontSize: "0.75rem",
                          width: "auto",
                        }}
                      >
                        RESET PASSWORD
                      </button>
                    </form>

                    <form action={toggleSmcStatusAction} style={{ display: "inline" }}>
                      <input type="hidden" name="userId" value={u.id} />
                      <button
                        type="submit"
                        className="btn btn-outline"
                        style={{
                          minHeight: "26px",
                          padding: "2px 8px",
                          fontSize: "0.75rem",
                          width: "auto",
                        }}
                      >
                        {u.isActive ? "DEACTIVATE" : "ACTIVATE"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
