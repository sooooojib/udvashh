import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "ud_session";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const isProtectedPath =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/watch") ||
    pathname.startsWith("/live-classes") ||
    pathname.startsWith("/intensive-classes");

  const isAuthPath =
    pathname.startsWith("/login") || pathname.startsWith("/signup");

  let isAuthenticated = false;

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      // Simple JWT check — verify the token has 3 parts and a valid payload
      // Full signature verification happens in session.ts on the server side
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp > now && payload.id && payload.email) {
          isAuthenticated = true;
        }
      }
    } catch {
      isAuthenticated = false;
    }
  }

  if (!isAuthenticated && isProtectedPath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
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
