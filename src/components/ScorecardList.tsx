"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, errorMessage } from "@/client/api";
import { RATING_FIELDS, type CandidateScorecards, type RatingField, type ScorecardView } from "@/lib/types";

const FIELDS = Object.entries(RATING_FIELDS) as [RatingField, string][];

// The CSV stores plain dates; format them in UTC so the day never shifts with the browser's time zone.
const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });

// Authored by LLM, model Claude Opus 5.5
export function ScorecardList({ candidateName }: { candidateName: string }) {
  const [data, setData] = useState<CandidateScorecards | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getScorecards(candidateName).then(setData, (e) => setError(errorMessage(e)));
  }, [candidateName]);

  const back = <Link href="/">← Candidates</Link>;
  if (error) return <>{back}<p role="alert">{error}</p></>;
  if (!data) return <p>Loading…</p>;

  const { candidate, scorecards } = data;
  return (
    <>
      {back}
      <h1>Scorecards</h1>
      <h2>{candidate.name}</h2>
      <p className="muted">{candidate.role}</p>
      <p>
        {candidate.isHiringManager
          ? "You are the hiring manager, so each scorecard is shown with its author."
          : "You submitted your scorecard, so you can read the rest. Other authors are hidden."}
      </p>
      <p>
        <strong>{scorecards.length} scorecard(s)</strong>
      </p>
      {scorecards.length === 0 && <p className="muted">No scorecards have been submitted yet.</p>}
      <ul className="card-list">
        {scorecards.map((s, i) => (
          <ScorecardCard key={`${s.author ?? "anonymous"}-${i}`} scorecard={s} />
        ))}
      </ul>
    </>
  );
}

// Authored by LLM, model Claude Opus 5.5
function ScorecardCard({ scorecard: s }: { scorecard: ScorecardView }) {
  const title = s.isOwn ? "You" : (s.author ?? "Interviewer");
  const subtitle = [s.isOwn ? "Your scorecard" : s.authorRole, dateFormat.format(new Date(s.submitted))]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="card" aria-label={`Scorecard by ${title}`}>
      <h3>{title}</h3>
      <p className="muted">{subtitle}</p>
      <dl className="ratings">
        {FIELDS.map(([field, label]) => (
          <div key={field}>
            <dt>{label}</dt>
            <dd>{s[field]}</dd>
          </div>
        ))}
      </dl>
      {s.notes && <p className="notes-text">{s.notes}</p>}
    </li>
  );
}
