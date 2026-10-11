"use client";

import { useActionState, useEffect } from "react";
import {
  softDeleteComplaintAction,
  type ModerationActionState,
} from "@/actions/complaint-moderation";

interface SoftDeleteModalProps {
  complaintId: number;
  rollNumber: string;
  name: string;
  onClose: () => void;
}

const initialState: ModerationActionState = {};

export function SoftDeleteModal({
  complaintId,
  rollNumber,
  name,
  onClose,
}: SoftDeleteModalProps) {
  const [state, action, isPending] = useActionState(
    softDeleteComplaintAction,
    initialState
  );

  useEffect(() => {
    if (state.success) {
      onClose();
    }
  }, [state.success, onClose]);

  return (
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
          maxWidth: "480px",
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
            marginBottom: "14px",
          }}
        >
          <strong style={{ fontSize: "1rem" }}>
            SOFT-DELETE COMPLAINT #{complaintId}
          </strong>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-outline"
            style={{ width: "auto", minHeight: "28px", padding: "2px 8px" }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: "0.85rem", color: "#767676", marginBottom: "14px" }}>
          Target: <strong>{name}</strong> ({rollNumber}). This complaint will be hidden from the public feed and SMC triage views.
        </p>

        <form action={action} className="form">
          <input type="hidden" name="complaintId" value={complaintId} />

          {state.error && <div className="alert alert-error">{state.error}</div>}

          <div className="field">
            <label htmlFor="delete-reason">
              REASON FOR REMOVAL (MANDATORY, MIN 5 CHARS)
            </label>
            <textarea
              id="delete-reason"
              name="reason"
              required
              rows={3}
              placeholder="e.g. Abusive profanity, false submission, spam test..."
              style={{
                fontFamily: "inherit",
                fontSize: "0.95rem",
                padding: "8px",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
            <button
              type="submit"
              className="btn btn-outline"
              disabled={isPending}
              style={{ minHeight: "38px" }}
            >
              {isPending ? "DELETING..." : "CONFIRM SOFT-DELETE"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn"
              style={{ width: "auto", minHeight: "38px", padding: "6px 16px" }}
            >
              CANCEL
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
