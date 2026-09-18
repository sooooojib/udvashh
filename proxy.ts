import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "ud_session";
const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "udvashh-neon-secret-please-set-in-env-32chars"
);

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip proxy for file upload routes to avoid body buffering (413 errors)
  if (pathname.startsWith("/api/upload")) {
    return NextResponse.next();
  }

  const isProtectedPath =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/watch") ||
    pathname.startsWith("/live-classes") ||
    pathname.startsWith("/intensive-classes") ||
    pathname.startsWith("/subject-hacks");

  const isAuthPath =
    pathname.startsWith("/login") || pathname.startsWith("/signup");

  let isAuthenticated = false;

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, SECRET);
      if (payload.id && payload.email) {
        isAuthenticated = true;
      }
    } catch {
      isAuthenticated = false;
    }
  }

  if (!isAuthenticated && isProtectedPath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectTo", pathname);
    const response = NextResponse.redirect(redirectUrl);
    if (token) {
      // Clear invalid or stale token so browser doesn't get stuck in a redirect loop
      response.cookies.delete(SESSION_COOKIE);
    }
    return response;
  }

  if (isAuthenticated && isAuthPath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    redirectUrl.searchParams.delete("redirectTo");
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
