"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api, errorMessage } from "@/client/api";
import type { CandidateSummary, User } from "@/lib/types";

// Edited by LLM, model GPT-6
export function AssignForm({ candidate, onAssigned }: { candidate: CandidateSummary; onAssigned: () => void }) {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userName, setUserName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Edited by LLM, model GPT-6
  useEffect(() => {
    Promise.all([api.listUsers(), api.getSession()]).then(
      // Authored by LLM, model GPT-6
      ([users, viewer]) => {
        setUsers(users);
        setCurrentUser(viewer);
      },
      // Authored by LLM, model GPT-6
      (e) => setError(errorMessage(e)),
    );
  }, []);

  const alreadyAssigned = new Set((candidate.assignees ?? []).map((a) => a.name));
  const available = users.filter(/* Edited by LLM, model GPT-6 */ (u) => u.name !== currentUser?.name && !alreadyAssigned.has(u.name));

  // Authored by LLM, model unknown
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.assignUser(candidate.name, userName);
      onAssigned();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit} aria-label={`Assign interviewer to ${candidate.name}`}>
      <label>
        Interviewer
        <select value={userName} onChange={(e) => setUserName(e.target.value)} required>
          <option value="">Choose a user…</option>
          {available.map((u) => (
            <option key={u.name} value={u.name}>
              {u.name} ({u.role})
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={saving || !userName}>
        {saving ? "Assigning…" : "Assign"}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
