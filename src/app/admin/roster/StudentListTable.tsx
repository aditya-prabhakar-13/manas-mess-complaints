"use client";

import { useState } from "react";
import type { Student } from "@/db/schema";
import { computeYearOfStudy } from "@/lib/date-utils";
import { StudentEditModal } from "./StudentEditModal";

interface StudentListTableProps {
  students: Student[];
}

export function StudentListTable({ students }: StudentListTableProps) {
  const [search, setSearch] = useState("");
  const [selectedBlock, setSelectedBlock] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const filtered = students.filter((s) => {
    const matchesSearch =
      !search ||
      s.rollNumber.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.roomNumber.toLowerCase().includes(search.toLowerCase());

    const matchesBlock =
      selectedBlock === "all" || s.block === selectedBlock;

    const matchesStatus =
      selectedStatus === "all" ||
      (selectedStatus === "active" && s.isActive) ||
      (selectedStatus === "inactive" && !s.isActive);

    return matchesSearch && matchesBlock && matchesStatus;
  });

  return (
    <div className="card" style={{ padding: "16px 20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          borderBottom: "var(--border)",
          paddingBottom: "10px",
          marginBottom: "14px",
        }}
      >
        <strong style={{ fontSize: "1rem" }}>
          REGISTERED BOARDERS ({filtered.length} OF {students.length})
        </strong>
      </div>

      {/* ── Search & Filter Controls ────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "16px",
          alignItems: "center",
        }}
      >
        <input
          type="text"
          placeholder="Search roll, name, room..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            maxWidth: "260px",
            fontSize: "0.85rem",
            padding: "6px 10px",
          }}
        />

        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <span style={{ fontSize: "0.8rem", color: "#767676" }}>BLOCK:</span>
          {["all", "A", "B", "C", "D"].map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setSelectedBlock(b)}
              className="btn btn-outline"
              style={{
                width: "auto",
                minHeight: "30px",
                padding: "2px 8px",
                fontSize: "0.75rem",
                backgroundColor: selectedBlock === b ? "var(--fg)" : "var(--bg)",
                color: selectedBlock === b ? "var(--bg)" : "var(--fg)",
              }}
            >
              {b.toUpperCase()}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <span style={{ fontSize: "0.8rem", color: "#767676" }}>STATUS:</span>
          {[
            { id: "all", label: "ALL" },
            { id: "active", label: "ACTIVE" },
            { id: "inactive", label: "INACTIVE" },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setSelectedStatus(st.id)}
              className="btn btn-outline"
              style={{
                width: "auto",
                minHeight: "30px",
                padding: "2px 8px",
                fontSize: "0.75rem",
                backgroundColor: selectedStatus === st.id ? "var(--fg)" : "var(--bg)",
                color: selectedStatus === st.id ? "var(--bg)" : "var(--fg)",
              }}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div style={{ padding: "30px 0", textAlign: "center", color: "#767676" }}>
          [NO BOARDERS MATCH CURRENT SEARCH/FILTER CRITERIA]
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
                <th style={{ padding: "8px 6px" }}>NAME</th>
                <th style={{ padding: "8px 6px" }}>BLOCK-ROOM</th>
                <th style={{ padding: "8px 6px" }}>COURSE</th>
                <th style={{ padding: "8px 6px" }}>YEAR OF STUDY</th>
                <th style={{ padding: "8px 6px" }}>STATUS</th>
                <th style={{ padding: "8px 6px", textAlign: "right" }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const yearInfo = computeYearOfStudy(s.yearOfJoining);

                return (
                  <tr
                    key={s.id}
                    style={{
                      borderBottom: "1px solid #222222",
                      backgroundColor: s.isActive ? "transparent" : "#111111",
                    }}
                  >
                    <td style={{ padding: "8px 6px" }}>
                      <strong>{s.rollNumber}</strong>
                    </td>
                    <td style={{ padding: "8px 6px" }}>{s.name}</td>
                    <td style={{ padding: "8px 6px" }}>
                      {s.block}-{s.roomNumber}
                    </td>
                    <td style={{ padding: "8px 6px" }}>{s.course}</td>
                    <td style={{ padding: "8px 6px" }}>
                      <span
                        style={{
                          color: yearInfo.isFlagged ? "#ff4444" : "var(--fg)",
                        }}
                      >
                        {yearInfo.label}
                      </span>
                    </td>
                    <td style={{ padding: "8px 6px" }}>
                      {s.isActive ? (
                        <span style={{ color: "var(--fg)" }}>ACTIVE</span>
                      ) : (
                        <span style={{ color: "#767676" }}>INACTIVE</span>
                      )}
                    </td>
                    <td style={{ padding: "8px 6px", textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => setEditingStudent(s)}
                        className="btn btn-outline"
                        style={{
                          minHeight: "26px",
                          padding: "2px 8px",
                          fontSize: "0.75rem",
                          width: "auto",
                        }}
                      >
                        EDIT
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editingStudent && (
        <StudentEditModal
          student={editingStudent}
          onClose={() => setEditingStudent(null)}
        />
      )}
    </div>
  );
}
