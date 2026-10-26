"use client";

import { useParams, useRouter } from "next/navigation";
import { scorecardsHref } from "@/client/routes";
import { ScorecardForm } from "@/components/ScorecardForm";

// Edited by LLM, model GPT-6
export default function SubmitScorecardPage() {
  const router = useRouter();
  const candidateName = decodeURIComponent(useParams<{ name: string }>().name);
  return (
    <ScorecardForm key={candidateName} candidateName={candidateName} onSubmitted={() => router.push(scorecardsHref(candidateName))} />
  );
}
