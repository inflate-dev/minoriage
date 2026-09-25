import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Remove Supabase auth cookies (including chunked ones like `.0`, `.1`)
// so a broken refresh token isn't retried on every request.
function clearAuthCookies(req: NextRequest, res: NextResponse) {
  req.cookies
    .getAll()
    .filter(({ name }) => name.startsWith('sb-') && name.includes('-auth-token'))
    .forEach(({ name }) => res.cookies.delete(name));
  return res;
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  // Refresh failed (invalid/expired refresh token or rate limited): drop the stale session
  const sessionBroken = !!error;

  // Protected routes
  const protectedRoutes = ['/dashboard', '/camera', '/space', '/analytics'];
  const isProtectedRoute = protectedRoutes.some(route =>
    req.nextUrl.pathname.startsWith(route)
  );

  // Redirect to login if not authenticated and trying to access protected route
  if (isProtectedRoute && !session) {
    const redirect = NextResponse.redirect(new URL('/login', req.url));
    return sessionBroken ? clearAuthCookies(req, redirect) : redirect;
  }

  // Redirect to dashboard if authenticated and trying to access login
  if ((req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/') && session) {
    return NextResponse.redirect(new URL('/camera', req.url));
  }

  return sessionBroken ? clearAuthCookies(req, res) : res;
}

export const config = {
  // Run only on page requests: skip API routes, all Next.js internals (_next/*)
  // and static files (anything with a file extension)
  matcher: ['/((?!api|_next/|favicon.ico|.*\\..*).*)'],
};
