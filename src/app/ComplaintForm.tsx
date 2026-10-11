"use client";

import { useActionState, useState } from "react";
import { submitComplaintAction, type ComplaintFormState } from "@/actions/complaints";
import type { MealOption } from "@/lib/gala";

const initialState: ComplaintFormState = {};

interface ComplaintFormProps {
  mealOptions: MealOption[];
  isGalaDay: boolean;
}

export function ComplaintForm({ mealOptions, isGalaDay }: ComplaintFormProps) {
  const [state, action, isPending] = useActionState(
    submitComplaintAction,
    initialState
  );
  const [charCount, setCharCount] = useState(0);

  return (
    <form action={action} className="form">
      {/* ── Error Banner ────────────────────────────────────────────── */}
      {state.error && (
        <div className="alert alert-error" role="alert">
          <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
            [ERROR]
          </div>
          <div>{state.error}</div>
        </div>
      )}

      {/* ── Meal Selection ─────────────────────────────────────────── */}
      <fieldset className="field" style={{ border: "none", padding: 0 }}>
        <legend
          style={{
            fontSize: "0.95rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontWeight: "bold",
            marginBottom: "8px",
          }}
        >
          SELECT MEAL
        </legend>

        {isGalaDay && (
          <div
            style={{
              padding: "6px 10px",
              border: "var(--border)",
              backgroundColor: "var(--fg)",
              color: "var(--bg)",
              fontSize: "0.85rem",
              fontWeight: "bold",
              marginBottom: "8px",
              letterSpacing: "0.05em",
            }}
          >
            ★ GALA DINNER ACTIVE TODAY — DINNER IS REPLACED
          </div>
        )}

        <div className="radio-group">
          {mealOptions.map((option, idx) => (
            <label key={option.id} className="radio-label">
              <input
                type="radio"
                name="meal"
                value={option.value}
                defaultChecked={idx === 0}
                required
              />
              <span>
                {option.label}
                {option.isGala && (
                  <span
                    style={{
                      marginLeft: "8px",
                      fontSize: "0.8rem",
                      border: "1px solid currentColor",
                      padding: "1px 6px",
                    }}
                  >
                    SPECIAL
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* ── Complaint Text Area ─────────────────────────────────────── */}
      <div className="field">
        <label htmlFor="complaint-text">COMPLAINT DETAILS</label>
        <textarea
          id="complaint-text"
          name="text"
          rows={6}
          minLength={10}
          maxLength={2000}
          required
          placeholder="Describe the issue with the mess food in detail (quality, taste, hygiene, quantity, foreign objects, cold food, etc.)..."
          onChange={(e) => setCharCount(e.target.value.length)}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "0.85rem",
            marginTop: "4px",
            color: "var(--fg)",
          }}
        >
          <span style={{ color: "#767676" }}>Min 10, max 2000 chars</span>
          <span
            id="char-counter-display"
            style={{
              fontWeight: "bold",
              color: charCount < 10 || charCount > 2000 ? "#767676" : "var(--fg)",
            }}
          >
            <span id="char-count">{charCount}</span> / 2000
          </span>
        </div>
      </div>

      {/* ── Honeypot Anti-Spam Trap ─────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: "-9999px",
          opacity: 0,
          pointerEvents: "none",
        }}
        aria-hidden="true"
      >
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {/* ── Submit Button ───────────────────────────────────────────── */}
      <button
        type="submit"
        className="btn"
        disabled={isPending}
        style={{ minHeight: "48px", marginTop: "8px" }}
      >
        {isPending ? "RECORDING COMPLAINT..." : "SUBMIT COMPLAINT"}
      </button>

      {/* ── Inline Vanilla Micro-Counter (<200 bytes fallback) ───────── */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){var t=document.getElementById('complaint-text'),c=document.getElementById('char-count');if(t&&c){t.addEventListener('input',function(e){c.textContent=e.target.value.length;});}})();`,
        }}
      />
    </form>
  );
}
