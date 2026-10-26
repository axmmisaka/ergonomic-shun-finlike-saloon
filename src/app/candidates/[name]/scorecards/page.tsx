"use client";

import { useParams } from "next/navigation";
import { ScorecardList } from "@/components/ScorecardList";

// Edited by LLM, model GPT-6
export default function ScorecardsPage() {
  const candidateName = decodeURIComponent(useParams<{ name: string }>().name);
  return <ScorecardList key={candidateName} candidateName={candidateName} />;
}
