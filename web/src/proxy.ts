import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_PREFIXES = ['/dashboard', '/akun', '/admin'];
const SESSION_HINT_COOKIE = 'has_session';

/**
 * Checks cookie presence only, not validity — the API is the real
 * authority. This avoids the latency of verifying a token at the edge
 * just to prevent a flash of a loading state. See .docs/07-auth.md §6.
 */
export const proxy = (request: NextRequest) => {
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix),
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  if (!request.cookies.has(SESSION_HINT_COOKIE)) {
    return NextResponse.redirect(new URL('/masuk', request.url));
  }

  return NextResponse.next();
};

export const config = {
  matcher: ['/dashboard/:path*', '/akun/:path*', '/admin/:path*'],
};
