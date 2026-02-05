import { NextResponse, type NextRequest } from "next/server";

const protectedRoutes = ["/dashboard", "/client"];

export function middleware(req: NextRequest) {
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next();
  }

  const path = req.nextUrl.pathname;

  const isProtected = protectedRoutes.some((route) => path.startsWith(route));
  if (!isProtected) return NextResponse.next();

  const hasAuthCookie = req.cookies.get("sb-access-token") || req.cookies.get("supabase-auth-token");

  if (!hasAuthCookie) {
    const signInUrl = new URL("/auth/signin", req.url);
    signInUrl.searchParams.set("next", path);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/client/:path*"]
};
