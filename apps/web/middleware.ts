import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('access_token');

  // Define public routes
  const isPublicRoute = pathname === '/login' || pathname.startsWith('/invite/');
  const isApiRoute = pathname.startsWith('/api/');

  // Allow access to public routes and API routes (backend handles its own auth)
  if (isPublicRoute || isApiRoute) {
    return NextResponse.next();
  }

  // Redirect to /login if no access token is present
  if (!accessToken) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
