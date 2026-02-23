'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logout } from './actions';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();

    // Don't show layout on login page
    if (pathname === '/admin/login') {
        return children;
    }

    const handleLogout = async () => {
        await logout();
        router.push('/admin/login');
        router.refresh();
    };

    return (
        <div className="flex min-h-screen bg-[#f5f3f9]">
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 z-10 flex h-screen w-64 flex-col border-r border-[#c8c2d8] bg-white shadow-sm">
                <div className="border-b border-[#e8e4f0] px-5 py-5">
                    <h1 className="text-lg font-bold tracking-tight text-[#1a1625]">Ad Pipeline Admin</h1>
                    <p className="mt-0.5 text-xs text-[#6b6480]">Creatives & Funnel Dashboard</p>
                </div>
                <nav className="flex-1 space-y-0.5 p-3">
                    <Link
                        href="/admin/dashboard"
                        className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                            pathname === '/admin/dashboard'
                                ? 'bg-[#1753a0] text-white'
                                : 'text-[#1a1625] hover:bg-[#e8e4f0]'
                        }`}
                    >
                        Funnel Dashboard
                    </Link>
                    <Link
                        href="/admin/creatives"
                        className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                            pathname === '/admin/creatives'
                                ? 'bg-[#1753a0] text-white'
                                : 'text-[#1a1625] hover:bg-[#e8e4f0]'
                        }`}
                    >
                        Creatives Gallery
                    </Link>
                </nav>
                <div className="border-t border-[#e8e4f0] p-3">
                    <button
                        onClick={handleLogout}
                        className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#6b6480] transition-colors hover:bg-[#e8e4f0] hover:text-[#1a1625]"
                    >
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="min-w-0 flex-1 pl-64">
                {children}
            </main>
        </div>
    );
}
