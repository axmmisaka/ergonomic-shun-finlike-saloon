"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { api, errorMessage } from "@/client/api";
import { scorecardsHref } from "@/client/routes";
import { RATINGS, RATING_FIELDS, type CandidateSummary, type Rating, type RatingField } from "@/lib/types";

const FIELDS = Object.entries(RATING_FIELDS) as [RatingField, string][];

interface Props {
  candidateName: string;
  onSubmitted: () => void;
}

// Authored by LLM, model Claude Opus 5.5
export function ScorecardForm({ candidateName, onSubmitted }: Props) {
  const [candidate, setCandidate] = useState<CandidateSummary | null>(null);
  const [ratings, setRatings] = useState<Partial<Record<RatingField, Rating>>>({});
  const [notes, setNotes] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getCandidate(candidateName).then(setCandidate, (e) => setLoadError(errorMessage(e)));
  }, [candidateName]);

  // Authored by LLM, model Claude Opus 5.5
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const missing = FIELDS.filter(([field]) => !ratings[field]).map(([, label]) => label);
    if (missing.length > 0) {
      setSubmitError(`Please rate: ${missing.join(", ")}`);
      return;
    }
    setSaving(true);
    setSubmitError(null);
    try {
      await api.submitScorecard(candidateName, { ...(ratings as Record<RatingField, Rating>), notes });
      onSubmitted();
    } catch (e) {
      setSubmitError(errorMessage(e));
      setSaving(false);
    }
  }

  const back = <Link href="/">← Candidates</Link>;
  if (loadError) return <>{back}<p role="alert">{loadError}</p></>;
  if (!candidate) return <p>Loading…</p>;
  if (!candidate.isAssigned) {
    return <>{back}<p>You are not assigned to interview {candidate.name}.</p></>;
  }
  if (candidate.hasSubmitted) {
    return (
      <>
        {back}
        <p>
          You already submitted a scorecard for {candidate.name}.{" "}
          <Link href={scorecardsHref(candidate.name)}>View scorecards</Link>
        </p>
      </>
    );
  }

  return (
    <>
      {back}
      <h1>Submit scorecard</h1>
      <p className="muted">
        One scorecard for this interview. After you submit, you can read the others with the author hidden.
      </p>
      <div className="card">
        <h3>{candidate.name}</h3>
        <p className="muted">
          {candidate.role} · {candidate.hiringManager} hires
        </p>
      </div>

      <form className="card" onSubmit={handleSubmit} aria-label="Scorecard">
        <h2>Attributes</h2>
        {FIELDS.map(([field, label]) => (
          <fieldset key={field} className="rating-row">
            <legend>{label}</legend>
            <div className="rating-options">
              {RATINGS.map((rating) => (
                <label key={rating} className="rating-option">
                  <input
                    type="radio"
                    name={field}
                    value={rating}
                    checked={ratings[field] === rating}
                    onChange={() => setRatings({ ...ratings, [field]: rating })}
                  />
                  {rating}
                </label>
              ))}
            </div>
          </fieldset>
        ))}

        <label className="notes">
          Notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            placeholder="What should the hiring manager remember from this interview?"
          />
        </label>

        {submitError && <p role="alert">{submitError}</p>}
        <div className="form-footer">
          <p className="muted small">
            The hiring manager always sees your name. Other assigned interviewers see this scorecard only after
            they submit, and your name is hidden from them.
          </p>
          <button type="submit" disabled={saving}>
            {saving ? "Submitting…" : "Submit scorecard"}
          </button>
        </div>
      </form>
    </>
  );
}
