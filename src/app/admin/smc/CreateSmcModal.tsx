"use client";

import { useActionState, useState } from "react";
import { createSmcUserAction, type SmcManageState } from "@/actions/smc-manage";

const initialState: SmcManageState = {};

export function CreateSmcModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [state, action, isPending] = useActionState(
    createSmcUserAction,
    initialState
  );
  const [copied, setCopied] = useState(false);

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ marginBottom: "16px" }}>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="btn"
        style={{ width: "auto", minHeight: "38px", padding: "6px 16px" }}
      >
        + PROVISION NEW SMC MEMBER
      </button>

      {isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 100,
            padding: "16px",
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: "460px",
              width: "100%",
              padding: "20px",
              backgroundColor: "var(--bg)",
              boxShadow: "0 0 0 4px var(--fg)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "var(--border)",
                paddingBottom: "10px",
                marginBottom: "16px",
              }}
            >
              <strong style={{ fontSize: "1rem" }}>
                PROVISION SMC ACCOUNT
              </strong>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="btn btn-outline"
                style={{ width: "auto", minHeight: "28px", padding: "2px 8px" }}
              >
                ✕
              </button>
            </div>

            {state.success && state.generatedPassword ? (
              <div
                style={{
                  border: "2px solid var(--fg)",
                  padding: "16px",
                  backgroundColor: "#0d0d0d",
                  marginBottom: "16px",
                }}
              >
                <div style={{ fontSize: "0.85rem", color: "#767676", marginBottom: "6px" }}>
                  ACCOUNT CREATED: <strong>{state.rollNumber}</strong>
                </div>
                <div style={{ fontSize: "0.85rem", marginBottom: "8px" }}>
                  ONE-TIME TEMPORARY PASSWORD:
                </div>
                <div
                  style={{
                    fontSize: "1.4rem",
                    fontWeight: "bold",
                    letterSpacing: "0.1em",
                    padding: "8px 12px",
                    border: "1px dashed var(--fg)",
                    marginBottom: "12px",
                    wordBreak: "break-all",
                  }}
                >
                  {state.generatedPassword}
                </div>
                <p style={{ fontSize: "0.8rem", color: "#ff4444", marginBottom: "12px" }}>
                  ⚠️ COPY THIS PASSWORD NOW. It is hashed and will never be shown again.
                </p>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => handleCopy(state.generatedPassword!)}
                    className="btn btn-outline"
                    style={{ width: "auto", padding: "4px 12px", fontSize: "0.85rem" }}
                  >
                    {copied ? "COPIED!" : "COPY PASSWORD"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="btn"
                    style={{ width: "auto", padding: "4px 12px", fontSize: "0.85rem" }}
                  >
                    DONE
                  </button>
                </div>
              </div>
            ) : (
              <form action={action} className="form">
                {state.error && <div className="alert alert-error">{state.error}</div>}

                <div className="field">
                  <label htmlFor="smc-roll">MEMBER ROLL NUMBER</label>
                  <input
                    id="smc-roll"
                    name="rollNumber"
                    type="text"
                    required
                    placeholder="e.g. 240101001 or SMC2026"
                  />
                  <span style={{ fontSize: "0.8rem", color: "#767676" }}>
                    A secure 10-character password will be auto-generated.
                  </span>
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                  <button
                    type="submit"
                    className="btn"
                    disabled={isPending}
                    style={{ minHeight: "38px" }}
                  >
                    {isPending ? "GENERATING..." : "GENERATE ACCOUNT"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="btn btn-outline"
                    style={{ width: "auto", minHeight: "38px", padding: "6px 16px" }}
                  >
                    CANCEL
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
