import { NextRequest, NextResponse } from 'next/server';

// Routes accessibles sans être connecté
const PUBLIC_PATHS = ['/login', '/api'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Laisser passer les routes publiques et les assets Next.js
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  // Vérifier le token dans les cookies
  const token = req.cookies.get('admin_token')?.value;

  if (!token) {
    // Pas de token → redirection vers /login
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
