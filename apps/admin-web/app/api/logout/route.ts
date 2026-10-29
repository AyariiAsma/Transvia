import { NextResponse } from 'next/server';

export async function GET() {
  const response = NextResponse.redirect(new URL('/login', process.env.NEXTAUTH_URL || 'http://localhost:3001'));
  // Supprimer le cookie de session
  response.cookies.set('admin_token', '', { maxAge: 0, path: '/' });
  return response;
}
