import { NextRequest, NextResponse } from "next/server";

export function GET(request: NextRequest) {
  const iconUrl = new URL("/icon.png?v=2", request.url);
  return NextResponse.redirect(iconUrl, 308);
}
