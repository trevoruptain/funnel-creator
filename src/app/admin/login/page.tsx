'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { login } from '../actions';

export default function AdminLoginPage() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await login(password);
            if (result.success) {
                router.push('/admin');
                router.refresh();
            } else {
                setError(result.error || 'Invalid password');
            }
        } catch (err) {
            setError('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#f5f3f9]">
            <div className="w-full max-w-md rounded-xl border border-[#c8c2d8] bg-white p-8 shadow-sm">
                <h1 className="mb-6 text-center text-xl font-bold tracking-tight text-[#1a1625]">Admin Login</h1>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="password" className="mb-2 block text-sm font-medium text-[#1a1625]">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-lg border border-[#c8c2d8] px-3 py-2 text-[#1a1625] focus:outline-none focus:ring-2 focus:ring-[#1753a0]"
                            required
                            autoFocus
                        />
                    </div>
                    {error && (
                        <div className="mb-4 rounded-lg bg-[#fce8ef] p-3 text-sm text-[#b8003c]">
                            {error}
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-[#1753a0] px-4 py-2 font-medium text-white hover:bg-[#0d3a6e] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading ? 'Logging in…' : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
}
