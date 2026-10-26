"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { decodeCandidateName } from "@/client/routes";
import { ScorecardList } from "@/components/ScorecardList";

// Edited by LLM, model GPT-6
export default function ScorecardsPage() {
  const candidateName = decodeCandidateName(useParams<{ name: string }>().name);
  if (candidateName === null) return <p role="alert">Invalid candidate URL. <Link href="/">Candidates</Link></p>;
  return <ScorecardList key={candidateName} candidateName={candidateName} />;
}
