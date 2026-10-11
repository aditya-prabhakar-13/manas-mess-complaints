"use client";

import { useActionState } from "react";
import { loginAdminAction, type AdminActionState } from "@/actions/admin-auth";

const initialState: AdminActionState = {};

export function AdminLoginForm() {
  const [state, action, isPending] = useActionState(
    loginAdminAction,
    initialState
  );

  return (
    <form action={action} className="form">
      {state.error && (
        <div className="alert alert-error" role="alert">
          <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
            [LOGIN ERROR]
          </div>
          <div>{state.error}</div>
        </div>
      )}

      <div className="field">
        <label htmlFor="admin-username">ADMIN USERNAME</label>
        <input
          id="admin-username"
          type="text"
          name="username"
          required
          autoComplete="username"
          placeholder="admin"
        />
      </div>

      <div className="field">
        <label htmlFor="admin-password">PASSWORD</label>
        <input
          id="admin-password"
          type="password"
          name="password"
          required
          autoComplete="current-password"
          placeholder="••••••••••••"
        />
      </div>

      <button
        type="submit"
        className="btn"
        disabled={isPending}
        style={{ minHeight: "48px", marginTop: "8px" }}
      >
        {isPending ? "AUTHENTICATING..." : "ADMIN LOGIN"}
      </button>
    </form>
  );
}
