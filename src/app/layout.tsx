import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Scorecards" };

// Authored by LLM, model Claude Opus 5.5
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
