"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { decodeCandidateName, scorecardsHref } from "@/client/routes";
import { ScorecardForm } from "@/components/ScorecardForm";

// Edited by LLM, model GPT-6
export default function SubmitScorecardPage() {
  const router = useRouter();
  const candidateName = decodeCandidateName(useParams<{ name: string }>().name);
  if (candidateName === null) return <p role="alert">Invalid candidate URL. <Link href="/">Candidates</Link></p>;
  return (
    <ScorecardForm key={candidateName} candidateName={candidateName} onSubmitted={() => router.push(scorecardsHref(candidateName))} />
  );
}
