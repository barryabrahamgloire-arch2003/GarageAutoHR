import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

const PUBLIC_PATHS = new Set(["/connexion", "/api/login", "/api/logout"]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/_next") || pathname === "/logo.jpg" || pathname === "/favicon.ico") {
    return NextResponse.next();
  }
  if (pathname === "/api/demandes" && (request.method === "POST" || request.method === "OPTIONS")) {
    return NextResponse.next();
  }
  const session = verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (PUBLIC_PATHS.has(pathname)) {
    if (session && pathname === "/connexion") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    const login = new URL("/connexion", request.url);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.jpg).*)"],
};
