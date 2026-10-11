"use client";

import { useActionState, useState, useTransition } from "react";
import {
  previewRosterAction,
  commitRosterAction,
  type RosterPreviewState,
} from "@/actions/roster-actions";

const initialState: RosterPreviewState = {};

export function RosterUploadForm() {
  const [previewState, previewAction, isPreviewing] = useActionState(
    previewRosterAction,
    initialState
  );

  const [isCommitting, startTransition] = useTransition();
  const [commitResult, setCommitResult] = useState<{
    success?: boolean;
    error?: string;
    message?: string;
  } | null>(null);

  function handleCommit() {
    if (!previewState.rows || previewState.rows.length === 0) return;
    setCommitResult(null);

    startTransition(async () => {
      const res = await commitRosterAction(JSON.stringify(previewState.rows));
      setCommitResult(res);
    });
  }

  const hasFatalErrors = (previewState.errors?.length ?? 0) > 0;

  return (
    <div className="card" style={{ padding: "16px 20px", marginBottom: "20px" }}>
      <div
        style={{
          fontSize: "1rem",
          fontWeight: "bold",
          marginBottom: "10px",
          paddingBottom: "8px",
          borderBottom: "var(--border)",
        }}
      >
        BULK ROSTER INGESTION (CSV / XLSX)
      </div>

      <p style={{ fontSize: "0.85rem", color: "#767676", marginBottom: "14px" }}>
        Upload hostel student roster spreadsheet. Expected headers: Roll Number, Name, Block (A-D), Room, Course, Year of Joining. Missing students in new upload will be marked inactive (historical complaints are preserved).
      </p>

      {/* ── File Selection Form ────────────────────────────────────── */}
      <form action={previewAction} style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="file"
            name="rosterFile"
            accept=".csv, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/csv"
            required
            style={{
              padding: "6px 8px",
              border: "var(--border)",
              backgroundColor: "var(--bg)",
              color: "var(--fg)",
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          />

          <button
            type="submit"
            className="btn btn-outline"
            disabled={isPreviewing}
            style={{ width: "auto", minHeight: "36px", padding: "6px 14px", fontSize: "0.85rem" }}
          >
            {isPreviewing ? "PARSING FILE..." : "INSPECT & PREVIEW"}
          </button>
        </div>
      </form>

      {/* ── Preview Result & Delta Summary ────────────────────────── */}
      {previewState.error && (
        <div className="alert alert-error" style={{ marginBottom: "12px" }}>
          {previewState.error}
        </div>
      )}

      {previewState.errors && previewState.errors.length > 0 && (
        <div
          className="alert alert-error"
          style={{ marginBottom: "12px", maxHeight: "160px", overflowY: "auto" }}
        >
          <strong>VALIDATION ERRORS FOUND ({previewState.errors.length}):</strong>
          <ul style={{ margin: "6px 0 0 16px", padding: 0 }}>
            {previewState.errors.map((e, idx) => (
              <li key={idx} style={{ fontSize: "0.85rem" }}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {previewState.warnings && previewState.warnings.length > 0 && (
        <div
          className="alert"
          style={{
            marginBottom: "12px",
            border: "1px solid #767676",
            maxHeight: "120px",
            overflowY: "auto",
          }}
        >
          <strong>WARNINGS ({previewState.warnings.length}):</strong>
          <ul style={{ margin: "6px 0 0 16px", padding: 0 }}>
            {previewState.warnings.map((w, idx) => (
              <li key={idx} style={{ fontSize: "0.85rem", color: "#767676" }}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {previewState.delta && (
        <div
          style={{
            border: "var(--border)",
            padding: "12px 16px",
            backgroundColor: "#0d0d0d",
            marginBottom: "14px",
          }}
        >
          <div style={{ fontSize: "0.9rem", fontWeight: "bold", marginBottom: "8px" }}>
            ROSTER DELTA BREAKDOWN:
          </div>

          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              fontSize: "0.85rem",
              marginBottom: "12px",
            }}
          >
            <span style={{ border: "1px solid var(--fg)", padding: "2px 8px" }}>
              + {previewState.delta.toInsertCount} NEW
            </span>
            <span style={{ border: "1px solid var(--fg)", padding: "2px 8px" }}>
              ~ {previewState.delta.toUpdateCount} TO UPDATE
            </span>
            <span style={{ border: "1px solid #767676", color: "#767676", padding: "2px 8px" }}>
              - {previewState.delta.toDeactivateCount} TO DEACTIVATE
            </span>
            <span style={{ color: "#767676", padding: "2px 8px" }}>
              = {previewState.delta.unchangedCount} UNCHANGED
            </span>
          </div>

          {hasFatalErrors ? (
            <div style={{ color: "#767676", fontSize: "0.85rem" }}>
              [COMMIT BLOCKED: Resolve validation errors in spreadsheet before applying.]
            </div>
          ) : (
            <button
              type="button"
              onClick={handleCommit}
              disabled={isCommitting}
              className="btn"
              style={{ width: "auto", minHeight: "38px", padding: "6px 20px" }}
            >
              {isCommitting ? "COMMITTING CHANGES..." : "✓ CONFIRM & COMMIT ROSTER UPDATE"}
            </button>
          )}
        </div>
      )}

      {commitResult && (
        <div
          className={commitResult.success ? "alert alert-success" : "alert alert-error"}
          style={{ marginTop: "12px" }}
        >
          {commitResult.message || commitResult.error}
        </div>
      )}
    </div>
  );
}
