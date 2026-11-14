import { NextResponse } from "next/server";

/**
 * /dev is for development only. A layout-level notFound() still streams the page's payload with a 200 once a loading
 * boundary has flushed, so production refuses these routes before rendering starts.
 */
export function middleware(): NextResponse {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dev", "/dev/:path*"],
};
