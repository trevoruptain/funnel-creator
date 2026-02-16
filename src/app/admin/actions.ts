'use server';

import { cookies } from 'next/headers';

export async function login(password: string) {
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

    if (!ADMIN_PASSWORD) {
        throw new Error('ADMIN_PASSWORD not configured');
    }

    if (password === ADMIN_PASSWORD) {
        (await cookies()).set('admin_auth', 'authenticated', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24, // 24 hours
        });
        return { success: true };
    }

    return { success: false, error: 'Invalid password' };
}

export async function logout() {
    (await cookies()).delete('admin_auth');
}
