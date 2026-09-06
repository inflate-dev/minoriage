import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const url = req.nextUrl.clone();

  // Protected routes
  const protectedRoutes = ['/dashboard', '/camera', '/space', '/analytics'];
  const isProtectedRoute = protectedRoutes.some(route => 
    req.nextUrl.pathname.startsWith(route)
  );

  // Redirect to login if not authenticated and trying to access protected route
  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Redirect to dashboard if authenticated and trying to access login
  if ((req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/') && session) {
    return NextResponse.redirect(new URL('/camera', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};