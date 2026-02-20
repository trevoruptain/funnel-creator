'use client';

import { AnalyticsProvider, FunnelProvider, FunnelRenderer } from '@/components/funnel';
import type { FunnelConfig, FunnelResponse } from '@/types/funnel';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

// Configure your tracking IDs here
const TRACKING_CONFIG = {
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID || '',
  googleAdsId: process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || '',
  apiEndpoint: process.env.NEXT_PUBLIC_API_ENDPOINT || '/api/funnel-response',
};

function FunnelPage() {
  const searchParams = useSearchParams();
  const funnelSlug = searchParams.get('funnel') || 'aurora-399-v1'; // Default funnel
  
  const [funnelConfig, setFunnelConfig] = useState<FunnelConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFunnel() {
      try {
        setLoading(true);
        const res = await fetch(`/api/funnels/${funnelSlug}`);
        if (!res.ok) {
          throw new Error('Funnel not found');
        }
        const data = await res.json();
        setFunnelConfig(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load funnel');
      } finally {
        setLoading(false);
      }
    }
    loadFunnel();
  }, [funnelSlug]);

  const handleComplete = (data: FunnelResponse) => {
    console.log('Funnel completed:', data);
    // Analytics are automatically tracked
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center max-w-md px-6">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Oops!</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Try refreshing the page or contact support.</p>
        </div>
      </div>
    );
  }

  if (!funnelConfig) return null;

  return (
    <AnalyticsProvider config={funnelConfig} trackingConfig={TRACKING_CONFIG}>
      <FunnelProvider config={funnelConfig} onComplete={handleComplete}>
        <FunnelRenderer />
      </FunnelProvider>
    </AnalyticsProvider>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        </div>
      }
    >
      <FunnelPage />
    </Suspense>
  );
}
