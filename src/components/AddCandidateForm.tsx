"use client";

import { useState, type FormEvent } from "react";
import { api, errorMessage } from "@/client/api";

// Authored by LLM, model unknown
export function AddCandidateForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Authored by LLM, model unknown
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.createCandidate({ name, role });
      setName("");
      setRole("");
      setOpen(false);
      onCreated();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}>
        + Add candidate
      </button>
    );
  }

  return (
    <form className="card inline-form" onSubmit={handleSubmit} aria-label="Add candidate">
      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label>
        Role
        <input value={role} onChange={(e) => setRole(e.target.value)} required />
      </label>
      {error && <p role="alert">{error}</p>}
      <div className="actions">
        <button type="submit" disabled={saving}>
          {saving ? "Adding…" : "Add"}
        </button>
        <button type="button" className="secondary" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
