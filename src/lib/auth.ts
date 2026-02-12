import { NextRequest, NextResponse } from 'next/server';

/**
 * Validates the API key from the `x-api-key` header against DATA_API_KEY env var.
 * Returns null if valid, or a 401 NextResponse if invalid.
 */
export function validateApiKey(request: NextRequest): NextResponse | null {
    const apiKey = request.headers.get('x-api-key');
    const expectedKey = process.env.DATA_API_KEY;

    if (!expectedKey) {
        return NextResponse.json(
            { error: 'DATA_API_KEY not configured on server' },
            { status: 500 }
        );
    }

    if (!apiKey || apiKey !== expectedKey) {
        return NextResponse.json(
            { error: 'Invalid or missing API key. Pass your key via the x-api-key header.' },
            { status: 401 }
        );
    }

    return null; // Valid
}
