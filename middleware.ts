import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAdminPath, isLegacyAdminPath } from "@/lib/admin-path";
import { generateCsrfToken, getAdminCsrfCookieName } from "@/lib/admin-security";

const ADMIN_CANONICAL_PATH = "/lounge-ops";

function isAdminUiPath(pathname: string, adminPath: string) {
  return pathname === adminPath || pathname === ADMIN_CANONICAL_PATH;
}

export function middleware(request: NextRequest) {
  const adminPath = getAdminPath();
  const { pathname } = request.nextUrl;

  if (isLegacyAdminPath(pathname)) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (pathname === adminPath && adminPath !== ADMIN_CANONICAL_PATH) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = ADMIN_CANONICAL_PATH;
    const response = NextResponse.rewrite(rewriteUrl);
    if (!request.cookies.get(getAdminCsrfCookieName())) {
      response.cookies.set(getAdminCsrfCookieName(), generateCsrfToken(), {
        httpOnly: true,
        sameSite: "strict",
        secure: true,
        path: "/",
      });
    }
    return response;
  }

  if (isAdminUiPath(pathname, adminPath) || pathname.startsWith("/api/admin/")) {
    const response = NextResponse.next();
    if (!request.cookies.get(getAdminCsrfCookieName())) {
      response.cookies.set(getAdminCsrfCookieName(), generateCsrfToken(), {
        httpOnly: true,
        sameSite: "strict",
        secure: true,
        path: "/",
      });
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/lounge-ops", "/api/admin/:path*", "/((?!_next|favicon.ico).*)"],
};
