"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "@/client/api";
import { scorecardsHref, submitHref } from "@/client/routes";
import type { CandidateSummary } from "@/lib/types";
import { AddCandidateForm } from "./AddCandidateForm";
import { AssignForm } from "./AssignForm";

// Edited by LLM, model GPT-6
export function CandidatesPage() {
  const [candidates, setCandidates] = useState<CandidateSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    api.listCandidates().then(setCandidates, (e) => setError(errorMessage(e)));
  }, []);
  useEffect(reload, [reload]);

  if (error) return <p role="alert">{error}</p>;
  if (!candidates) return <p>Loading candidates…</p>;

  // A candidate appears in both lists when another interviewer has assigned the manager.
  const managed = candidates.filter((c) => c.isHiringManager);
  const assigned = candidates.filter((c) => c.isAssigned);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Candidates</h1>
          <p className="muted">People you are the hiring manager for, and interviews assigned to you.</p>
        </div>
        <AddCandidateForm onCreated={reload} />
      </div>

      <section aria-labelledby="managed-heading">
        <h2 id="managed-heading">Hiring manager ({managed.length})</h2>
        {managed.length === 0 && <p className="muted">You are not the hiring manager for anyone yet.</p>}
        <ul className="card-list">
          {managed.map((c) => (
            <ManagedCandidate key={c.name} candidate={c} onAssigned={reload} />
          ))}
        </ul>
      </section>

      <section aria-labelledby="assigned-heading">
        <h2 id="assigned-heading">Assigned to you ({assigned.length})</h2>
        {assigned.length === 0 && <p className="muted">No interviews assigned to you.</p>}
        <ul className="card-list">
          {assigned.map((c) => (
            <AssignedCandidate key={c.name} candidate={c} onAssigned={reload} />
          ))}
        </ul>
      </section>
    </>
  );
}

// Authored by LLM, model unknown
function ManagedCandidate({ candidate, onAssigned }: { candidate: CandidateSummary; onAssigned: () => void }) {
  const [assigning, setAssigning] = useState(false);
  const assignees = candidate.assignees ?? [];
  const submittedCount = assignees.filter((a) => a.submitted).length;

  return (
    <li className="card" aria-label={candidate.name}>
      <div className="card-row">
        <div>
          <h3>{candidate.name}</h3>
          <p className="muted">{candidate.role}</p>
          <p className="muted">
            {assignees.length === 0
              ? "No interviewers assigned yet"
              : `Assigned to ${assignees.map((a) => a.name).join(", ")}`}
            {" · "}
            {submittedCount === 0 ? "No scorecards yet" : `${submittedCount} scorecard(s)`}
          </p>
        </div>
        <div className="actions">
          <button type="button" className="secondary" onClick={() => setAssigning(!assigning)}>
            Assign
          </button>
          <Link className="button secondary" href={scorecardsHref(candidate.name)}>
            View scorecards
          </Link>
        </div>
      </div>
      {assigning && (
        <AssignForm
          candidate={candidate}
          onAssigned={() => {
            setAssigning(false);
            onAssigned();
          }}
        />
      )}
    </li>
  );
}

// Edited by LLM, model GPT-6
function AssignedCandidate({ candidate, onAssigned }: { candidate: CandidateSummary; onAssigned: () => void }) {
  const [assigning, setAssigning] = useState(false);
  return (
    <li className="card" aria-label={candidate.name}>
      <div className="card-row">
        <div>
          <h3>{candidate.name}</h3>
          <p className="muted">{candidate.role}</p>
          <p className="muted">
            {candidate.isHiringManager ? "You are" : `${candidate.hiringManager} is`} the hiring manager
            {" · "}
            {candidate.hasSubmitted ? "Scorecard submitted" : "Scorecard not submitted"}
          </p>
        </div>
        <div className="actions">
          <button type="button" className="secondary" onClick={() => setAssigning(!assigning)}>
            Assign
          </button>
          {candidate.hasSubmitted ? (
            <Link className="button secondary" href={scorecardsHref(candidate.name)}>
              View scorecards
            </Link>
          ) : (
            <Link className="button" href={submitHref(candidate.name)}>
              Submit scorecard
            </Link>
          )}
        </div>
      </div>
      {assigning && (
        <AssignForm
          candidate={candidate}
          onAssigned={() => {
            setAssigning(false);
            onAssigned();
          }}
        />
      )}
    </li>
  );
}
