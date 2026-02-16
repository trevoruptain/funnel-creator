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
        router.push(`/admin?${params.toString()}`);
    };


    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Creatives Gallery</h1>
                <div className="flex gap-4">
                    <select
                        className="px-4 py-2 border border-gray-300 rounded-md"
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
                    <div key={image.id} className="bg-white rounded-lg shadow-md overflow-hidden">
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
                            <p className="text-sm text-gray-600 mb-2">{image.adConcept.project.name}</p>
                            <p className="text-xs text-gray-500 mb-3">
                                {new Date(image.createdAt).toLocaleDateString()}
                            </p>
                            {image.designJson && (
                                <details className="text-xs">
                                    <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                                        View Design JSON
                                    </summary>
                                    <pre className="mt-2 p-2 bg-gray-50 rounded overflow-x-auto">
                                        {JSON.stringify(image.designJson as Record<string, unknown>, null, 2)}
                                    </pre>
                                </details>
                            )}
                            {image.blobUrl && (
                                <a
                                    href={image.blobUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block mt-3 text-sm text-blue-600 hover:text-blue-800"
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
                            href={`/admin?page=${p}${projectFilter ? `&project=${projectFilter}` : ''}`}
                            className={`px-4 py-2 rounded-md ${
                                p === page
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            {p}
                        </Link>
                    ))}
                </div>
            )}

            {imagesData.length === 0 && (
                <div className="text-center text-gray-500 py-12">
                    No creatives found.
                </div>
            )}
        </div>
    );
}

export default function AdminPage() {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center h-96">
                <div className="text-gray-500">Loading...</div>
            </div>
        }>
            <AdminPageContent />
        </Suspense>
    );
}

