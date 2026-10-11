"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn"
      style={{
        width: "auto",
        minHeight: "40px",
        padding: "8px 24px",
        fontSize: "0.9rem",
      }}
    >
      🖨 PRINT TABLE CARDS [Ctrl+P]
    </button>
  );
}
