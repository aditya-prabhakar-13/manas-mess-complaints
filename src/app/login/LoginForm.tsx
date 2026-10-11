"use client";

import { useActionState } from "react";
import { loginBoarderAction, type LoginState } from "@/actions/boarder-auth";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, action, isPending] = useActionState(loginBoarderAction, initialState);

  return (
    <>
      {state.error && (
        <div className="alert alert-error" role="alert" aria-live="assertive">
          {state.error}
        </div>
      )}

      <form action={action} noValidate>
        <div className="field">
          <label htmlFor="block">BLOCK</label>
          <select id="block" name="block" required defaultValue="">
            <option value="" disabled>-- SELECT BLOCK --</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="roomNumber">ROOM NUMBER</label>
          <input
            id="roomNumber"
            type="text"
            name="roomNumber"
            placeholder="e.g. 214"
            required
            autoComplete="off"
            spellCheck={false}
            maxLength={20}
          />
        </div>

        <div className="field">
          <label htmlFor="rollNumber">ROLL NUMBER</label>
          <input
            id="rollNumber"
            type="text"
            name="rollNumber"
            placeholder="e.g. 240101001"
            required
            autoComplete="off"
            spellCheck={false}
            maxLength={50}
          />
        </div>

        <button
          type="submit"
          className="btn"
          disabled={isPending}
          aria-busy={isPending}
        >
          {isPending ? "VERIFYING..." : "LOG IN"}
        </button>
      </form>
    </>
  );
}
