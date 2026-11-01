import { NextResponse } from "next/server";

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export function apiJson(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function unauthorized() {
  return apiError("Please log in to continue.", 401);
}

/** The cookie-session website API is retired; only the mobile API under /api/mobile is supported. */
export function legacyRetired() {
  return apiError("This website API has been retired. Use the Qram mobile app.", 410);
}
