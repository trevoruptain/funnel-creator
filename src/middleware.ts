import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
    // Only protect /admin routes
    if (!request.nextUrl.pathname.startsWith('/admin')) {
        return NextResponse.next();
    }

    // Allow access to login page
    if (request.nextUrl.pathname === '/admin/login') {
        return NextResponse.next();
    }

    // Check for auth cookie
    const authCookie = request.cookies.get('admin_auth');
    const isAuthenticated = authCookie?.value === 'authenticated';

    if (!isAuthenticated) {
        return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/admin/:path*',
};
