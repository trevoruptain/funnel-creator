'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function AdminPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const projectFilter = searchParams.get('project') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = 12;

    const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
    const [imagesData, setImagesData] = useState<Array<any>>([]);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            const res = await fetch(`/api/admin/creatives?project=${projectFilter}&page=${page}`);
            const data = await res.json();
            setProjects(data.projects);
            setImagesData(data.images);
            setTotalPages(data.totalPages);
            setLoading(false);
        }
        fetchData();
    }, [projectFilter, page]);

    const handleProjectChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set('project', value);
        } else {
            params.delete('project');
        }
        params.delete('page');
        router.push(`/admin/creatives?${params.toString()}`);
    };


    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="text-[#6b6480]">Loading...</div>
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="mb-8 flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight text-[#1a1625]">Creatives Gallery</h1>
                <div className="flex gap-4">
                    <select
                        className="rounded-lg border border-[#c8c2d8] bg-white px-3 py-2 text-sm text-[#1a1625] focus:outline-none focus:ring-2 focus:ring-[#1753a0]"
                        value={projectFilter}
                        onChange={(e) => handleProjectChange(e.target.value)}
                    >
                        <option value="">All Projects</option>
                        {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Images Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {imagesData.map((image) => (
                    <div key={image.id} className="overflow-hidden rounded-xl border border-[#c8c2d8] bg-white shadow-sm transition-shadow hover:shadow-md">
                        {image.blobUrl && (
                            <div className="relative h-96">
                                <Image
                                    src={image.blobUrl}
                                    alt={image.adConcept.headline}
                                    fill
                                    className="object-cover"
                                />
                            </div>
                        )}
                        <div className="p-4">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-semibold text-lg">{image.adConcept.headline}</h3>
                                <span
                                    className={`px-2 py-1 text-xs rounded-full ${
                                        image.status === 'generated'
                                            ? 'bg-green-100 text-green-800'
                                            : image.status === 'pending'
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : 'bg-red-100 text-red-800'
                                    }`}
                                >
                                    {image.status}
                                </span>
                            </div>
                            <p className="mb-2 text-sm text-[#6b6480]">{image.adConcept.project.name}</p>
                            <p className="mb-3 text-xs text-[#6b6480]">
                                {new Date(image.createdAt).toLocaleDateString()}
                            </p>
                            {image.designJson && (
                                <details className="text-xs">
                                    <summary className="cursor-pointer text-[#1753a0] hover:text-[#0d3a6e]">
                                        View Design JSON
                                    </summary>
                                    <pre className="mt-2 overflow-x-auto rounded bg-[#f5f3f9] p-2 text-xs">
                                        {JSON.stringify(image.designJson as Record<string, unknown>, null, 2)}
                                    </pre>
                                </details>
                            )}
                            {image.blobUrl && (
                                <a
                                    href={image.blobUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-3 block text-sm font-medium text-[#1753a0] hover:text-[#0d3a6e]"
                                >
                                    Open Full Size →
                                </a>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <Link
                            key={p}
                            href={`/admin/creatives?page=${p}${projectFilter ? `&project=${projectFilter}` : ''}`}
                            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                                p === page
                                    ? 'bg-[#1753a0] text-white'
                                    : 'bg-white text-[#1a1625] hover:bg-[#e8e4f0]'
                            }`}
                        >
                            {p}
                        </Link>
                    ))}
                </div>
            )}

            {imagesData.length === 0 && (
                <div className="py-12 text-center text-[#6b6480]">
                    No creatives found.
                </div>
            )}
        </div>
    );
}

export default function AdminPage() {
    return (
        <Suspense fallback={
            <div className="flex h-96 items-center justify-center">
                <div className="text-[#6b6480]">Loading...</div>
            </div>
        }>
            <AdminPageContent />
        </Suspense>
    );
}

