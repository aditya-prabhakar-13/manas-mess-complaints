"use client";

import { useActionState } from "react";
import type { GalaDate } from "@/db/schema";
import { formatISTDateTime } from "@/lib/date-utils";
import {
  addGalaDateAction,
  removeGalaDateAction,
  type GalaActionState,
} from "@/actions/gala-manage";

interface GalaDateListProps {
  dates: GalaDate[];
}

const initialState: GalaActionState = {};

export function GalaDateList({ dates }: GalaDateListProps) {
  const [addState, addAction, isAdding] = useActionState(
    addGalaDateAction,
    initialState
  );

  return (
    <div>
      {/* ── Schedule New Gala Date Form ───────────────────────────── */}
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
          SCHEDULE SPECIAL GALA DINNER
        </div>

        <p style={{ fontSize: "0.85rem", color: "#767676", marginBottom: "14px" }}>
          On scheduled Gala dates, Dinner is dynamically replaced by Gala Dinner in the boarder complaint form and backend validation.
        </p>

        <form action={addAction} className="form" style={{ maxWidth: "480px" }}>
          {addState.error && <div className="alert alert-error">{addState.error}</div>}
          {addState.success && (
            <div className="alert alert-success">
              Gala Dinner date scheduled successfully.
            </div>
          )}

          <div className="field">
            <label htmlFor="gala-date">GALA DINNER DATE (YYYY-MM-DD)</label>
            <input
              id="gala-date"
              name="galaDate"
              type="date"
              required
              style={{
                fontFamily: "inherit",
                fontSize: "1rem",
                padding: "8px",
              }}
            />
          </div>

          <div className="field">
            <label htmlFor="gala-desc">DESCRIPTION (OPTIONAL)</label>
            <input
              id="gala-desc"
              name="description"
              type="text"
              placeholder="e.g. Diwali Special Gala Dinner, Farewell Feast"
            />
          </div>

          <button
            type="submit"
            className="btn"
            disabled={isAdding}
            style={{ width: "auto", minHeight: "38px", padding: "6px 20px" }}
          >
            {isAdding ? "SAVING..." : "+ ADD GALA DINNER DATE"}
          </button>
        </form>
      </div>

      {/* ── Scheduled Dates Table ─────────────────────────────────── */}
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
          SCHEDULED GALA DATES ({dates.length})
        </div>

        {dates.length === 0 ? (
          <div style={{ padding: "30px 0", textAlign: "center", color: "#767676" }}>
            [NO GALA DINNER DATES SCHEDULED]
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
                  <th style={{ padding: "8px 6px" }}>DATE (IST)</th>
                  <th style={{ padding: "8px 6px" }}>DESCRIPTION</th>
                  <th style={{ padding: "8px 6px" }}>ADDED ON</th>
                  <th style={{ padding: "8px 6px", textAlign: "right" }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {dates.map((d) => (
                  <tr
                    key={d.id}
                    style={{
                      borderBottom: "1px solid #222222",
                    }}
                  >
                    <td style={{ padding: "8px 6px" }}>
                      <strong style={{ fontSize: "0.95rem" }}>{d.galaDate}</strong>
                    </td>
                    <td style={{ padding: "8px 6px" }}>
                      {d.description || <span style={{ color: "#767676" }}>—</span>}
                    </td>
                    <td style={{ padding: "8px 6px", color: "#767676" }}>
                      {formatISTDateTime(d.createdAt)}
                    </td>
                    <td style={{ padding: "8px 6px", textAlign: "right" }}>
                      <form action={removeGalaDateAction} style={{ display: "inline" }}>
                        <input type="hidden" name="dateId" value={d.id} />
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
                          DELETE
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
    </div>
  );
}
