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
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white shadow-md fixed left-0 top-0 h-screen flex flex-col">
                <div className="p-6 border-b">
                    <h1 className="text-xl font-bold">Ad Pipeline Admin</h1>
                </div>
                <nav className="p-4 flex-1">
                    <Link
                        href="/admin"
                        className={`block px-4 py-2 rounded-md mb-2 ${
                            pathname === '/admin'
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                        Creatives Gallery
                    </Link>
                </nav>
                <div className="p-4 border-t">
                    <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                    >
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 p-8 ml-64">
                {children}
            </main>
        </div>
    );
}
