"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { api, ApiRequestError, errorMessage } from "@/client/api";
import type { User } from "@/lib/types";

// Edited by LLM, model GPT-6
/**
 * Page chrome plus the simulated sign-in. Page content renders only once a
 * user is signed in, and is keyed by user name, so switching users remounts
 * the page and it refetches data as the new user.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listUsers().then(setUsers, (e) => setError(errorMessage(e)));
    api
      .getSession()
      .then(setCurrentUser, (e) => {
        if (!(e instanceof ApiRequestError && e.status === 401)) setError(errorMessage(e));
      })
      .finally(() => setReady(true));
  }, []);

  // Edited by LLM, model GPT-6
  async function switchUser(name: string) {
    if (!name) return;
    setSwitching(true);
    setError(null);
    try {
      setCurrentUser(await api.signIn(name));
    } catch (e) {
      setError(errorMessage(e));
      // A lost response may still have changed the cookie; require selection again.
      setCurrentUser(null);
    } finally {
      setSwitching(false);
    }
  }

  return (
    <>
      <header className="topbar">
        <Link href="/" className="brand">
          Scorecards
        </Link>
        <label className="user-switcher">
          Signed in as
          <select disabled={!ready || switching} value={currentUser?.name ?? ""} onChange={(e) => switchUser(e.target.value)}>
            {!currentUser && <option value="">Choose a user…</option>}
            {users.map((u) => (
              <option key={u.name} value={u.name}>
                {u.name} ({u.role})
              </option>
            ))}
          </select>
        </label>
      </header>
      <main className="page">
        {error && <p role="alert">{error}</p>}
        {!ready || switching ? (
          <p>Loading…</p>
        ) : currentUser ? (
          <div key={currentUser.name}>{children}</div>
        ) : (
          <p>Choose who is signed in from the menu at the top right.</p>
        )}
      </main>
    </>
  );
}
