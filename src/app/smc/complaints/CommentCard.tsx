import type { FormattedComplaint } from "@/lib/complaints-query";

interface CommentCardProps {
  complaint: FormattedComplaint;
}

export function CommentCard({ complaint }: CommentCardProps) {
  return (
    <article
      className="card"
      style={{
        padding: "14px 16px",
        marginBottom: "12px",
        backgroundColor: "var(--bg)",
      }}
    >
      {/* ── Metadata Header ────────────────────────────────────────── */}
      <div
        style={{
          borderBottom: "var(--border)",
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
              {complaint.mealLabel}
            </span>
            <span>Submitted: {complaint.formattedTime}</span>
          </div>

          <span style={{ fontSize: "0.75rem" }}>
            ID #{complaint.id}
          </span>
        </div>
      </div>

      {/* ── Complaint Content ──────────────────────────────────────── */}
      <div
        style={{
          fontSize: "1rem",
          lineHeight: "1.5",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          padding: "4px 0",
        }}
      >
        {complaint.complaintText}
      </div>
    </article>
  );
}
