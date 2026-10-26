import { NextResponse, type NextRequest } from "next/server";

// Authored by LLM, model GPT-6
export function proxy(request: NextRequest) {
  // Reject invalid encoding before Next's dynamic-route matching can turn it into a 500.
  // Decode only to validate; the original URL must retain its encoding for routing.
  try {
    decodeURIComponent(request.nextUrl.pathname);
  } catch {
    return NextResponse.json({ error: "Invalid candidate URL encoding" }, { status: 400 });
  }
  return NextResponse.next();
}

export const config = { matcher: ["/candidates/:path*", "/api/candidates/:path*"] };
