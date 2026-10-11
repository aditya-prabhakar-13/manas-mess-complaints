"use client";

import { useActionState } from "react";
import { loginSmcAction, type SmcLoginState } from "@/actions/smc-auth";

const initialState: SmcLoginState = {};

export function SmcLoginForm() {
  const [state, action, isPending] = useActionState(
    loginSmcAction,
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
        <label htmlFor="smc-roll">ROLL NUMBER</label>
        <input
          id="smc-roll"
          type="text"
          name="rollNumber"
          required
          autoComplete="username"
          placeholder="e.g. SMC2026 or Student Roll"
        />
      </div>

      <div className="field">
        <label htmlFor="smc-password">PASSWORD</label>
        <input
          id="smc-password"
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
        {isPending ? "AUTHENTICATING..." : "SMC LOGIN"}
      </button>
    </form>
  );
}
