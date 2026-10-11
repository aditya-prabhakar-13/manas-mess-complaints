"use client";

import { useActionState } from "react";
import { updateStudentAction, type StudentActionState } from "@/actions/roster-actions";
import type { Student } from "@/db/schema";

interface StudentEditModalProps {
  student: Student;
  onClose: () => void;
}

const initialState: StudentActionState = {};

export function StudentEditModal({ student, onClose }: StudentEditModalProps) {
  const [state, action, isPending] = useActionState(
    updateStudentAction,
    initialState
  );

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
          maxWidth: "500px",
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
            EDIT STUDENT: {student.rollNumber}
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

        <form action={action} className="form">
          <input type="hidden" name="studentId" value={student.id} />

          {state.error && <div className="alert alert-error">{state.error}</div>}
          {state.success && (
            <div className="alert alert-success">
              {state.message}
              <div style={{ marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-outline"
                  style={{ width: "auto", padding: "4px 12px" }}
                >
                  Close
                </button>
              </div>
            </div>
          )}

          <div className="field">
            <label htmlFor="edit-name">FULL NAME</label>
            <input
              id="edit-name"
              name="name"
              type="text"
              defaultValue={student.name}
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div className="field">
              <label htmlFor="edit-block">BLOCK (A-D)</label>
              <select
                id="edit-block"
                name="block"
                defaultValue={student.block}
                style={{
                  padding: "8px",
                  border: "var(--border)",
                  backgroundColor: "var(--bg)",
                  color: "var(--fg)",
                  fontFamily: "inherit",
                }}
              >
                <option value="A">Block A</option>
                <option value="B">Block B</option>
                <option value="C">Block C</option>
                <option value="D">Block D</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="edit-room">ROOM NUMBER</label>
              <input
                id="edit-room"
                name="roomNumber"
                type="text"
                defaultValue={student.roomNumber}
                required
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div className="field">
              <label htmlFor="edit-course">COURSE</label>
              <input
                id="edit-course"
                name="course"
                type="text"
                defaultValue={student.course}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="edit-year">YEAR OF JOINING</label>
              <input
                id="edit-year"
                name="yearOfJoining"
                type="number"
                defaultValue={student.yearOfJoining}
                required
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="edit-active">ACCOUNT STATUS</label>
            <select
              id="edit-active"
              name="isActive"
              defaultValue={student.isActive ? "true" : "false"}
              style={{
                padding: "8px",
                border: "var(--border)",
                backgroundColor: "var(--bg)",
                color: "var(--fg)",
                fontFamily: "inherit",
              }}
            >
              <option value="true">Active (Can submit complaints)</option>
              <option value="false">Inactive / Alum (Deactivated)</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
            <button
              type="submit"
              className="btn"
              disabled={isPending}
              style={{ minHeight: "38px" }}
            >
              {isPending ? "SAVING..." : "SAVE CHANGES"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
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
