import { NextRequest, NextResponse } from "next/server";
import { shouldNoIndexHost } from "@/lib/deployment";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  if (shouldNoIndexHost(request.nextUrl.hostname)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
