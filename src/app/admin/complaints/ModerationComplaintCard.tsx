"use client";

import { useState } from "react";
import type { Complaint } from "@/db/schema";
import { formatISTDateTime } from "@/lib/date-utils";
import { MEAL_LABELS } from "@/lib/complaint-limits";
import { restoreComplaintAction } from "@/actions/complaint-moderation";
import { SoftDeleteModal } from "./SoftDeleteModal";

interface ModerationComplaintCardProps {
  complaint: Complaint;
}

export function ModerationComplaintCard({
  complaint,
}: ModerationComplaintCardProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const mealLabel = MEAL_LABELS[complaint.meal] ?? complaint.meal;

  return (
    <article
      className="card"
      style={{
        padding: "14px 16px",
        marginBottom: "12px",
        backgroundColor: complaint.isDeleted ? "#0d0d0d" : "var(--bg)",
        border: complaint.isDeleted ? "2px dashed #767676" : "var(--border)",
      }}
    >
      {/* ── Metadata Header ────────────────────────────────────────── */}
      <div
        style={{
          borderBottom: "1px solid #222222",
          paddingBottom: "8px",
          marginBottom: "10px",
          fontSize: "0.85rem",
          letterSpacing: "0.04em",
          lineHeight: "1.5",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "6px",
          }}
        >
          <div>
            <strong style={{ fontSize: "0.95rem" }}>
              {complaint.nameSnapshot}
            </strong>{" "}
            <span>({complaint.blockRoomSnapshot})</span>
            <span style={{ color: "#767676", marginLeft: "8px" }}>
              Roll: {complaint.rollNumber}
            </span>
          </div>

          <div style={{ color: "#767676" }}>
            <span>{complaint.yearOfStudySnapshot}</span>
            <span style={{ margin: "0 6px" }}>•</span>
            <span>{complaint.courseSnapshot}</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "6px",
            fontSize: "0.8rem",
            color: "#767676",
          }}
        >
          <div>
            <span
              style={{
                display: "inline-block",
                border: "1px solid currentColor",
                padding: "1px 6px",
                color: "var(--fg)",
                fontWeight: "bold",
                marginRight: "8px",
                textTransform: "uppercase",
              }}
            >
              {mealLabel}
            </span>
            <span>Submitted: {formatISTDateTime(complaint.createdAt)}</span>
          </div>

          <span style={{ fontSize: "0.75rem" }}>ID #{complaint.id}</span>
        </div>
      </div>

      {/* ── Complaint Body ─────────────────────────────────────────── */}
      <div
        style={{
          fontSize: "1rem",
          lineHeight: "1.5",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          padding: "4px 0",
          color: complaint.isDeleted ? "#767676" : "var(--fg)",
          textDecoration: complaint.isDeleted ? "line-through" : "none",
        }}
      >
        {complaint.complaintText}
      </div>

      {/* ── Moderation Status & Action Bar ─────────────────────────── */}
      <div
        style={{
          marginTop: "12px",
          paddingTop: "8px",
          borderTop: "1px solid #222222",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px",
          fontSize: "0.8rem",
        }}
      >
        {complaint.isDeleted ? (
          <div>
            <span style={{ color: "#ff4444", fontWeight: "bold" }}>[SOFT-DELETED]</span>
            <span style={{ color: "#767676", marginLeft: "6px" }}>
              By {complaint.deletedBy} on{" "}
              {complaint.deletedAt ? formatISTDateTime(complaint.deletedAt) : "—"}
            </span>
            <div style={{ color: "#767676", marginTop: "2px" }}>
              Reason: &ldquo;{complaint.deletedReason}&rdquo;
            </div>
          </div>
        ) : (
          <span style={{ color: "var(--fg)" }}>[STATUS: ACTIVE FEED]</span>
        )}

        <div>
          {complaint.isDeleted ? (
            <form action={restoreComplaintAction}>
              <input type="hidden" name="complaintId" value={complaint.id} />
              <button
                type="submit"
                className="btn btn-outline"
                style={{
                  minHeight: "28px",
                  padding: "2px 10px",
                  fontSize: "0.75rem",
                  width: "auto",
                }}
              >
                RESTORE COMPLAINT
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="btn btn-outline"
              style={{
                minHeight: "28px",
                padding: "2px 10px",
                fontSize: "0.75rem",
                width: "auto",
                borderColor: "#767676",
                color: "#767676",
              }}
            >
              SOFT DELETE...
            </button>
          )}
        </div>
      </div>

      {showDeleteModal && (
        <SoftDeleteModal
          complaintId={complaint.id}
          rollNumber={complaint.rollNumber}
          name={complaint.nameSnapshot}
          onClose={() => setShowDeleteModal(false)}
        />
      )}
    </article>
  );
}
