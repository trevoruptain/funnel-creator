'use client';

import { FunnelProvider, FunnelRenderer, AnalyticsProvider } from '@/components/funnel';
import { maternalFetalFunnel399 } from '@/funnels/maternal-fetal-399';
import type { FunnelResponse } from '@/types/funnel';

// Configure your tracking IDs here
const TRACKING_CONFIG = {
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID || '',
  googleAdsId: process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || '',
  apiEndpoint: process.env.NEXT_PUBLIC_API_ENDPOINT || '/api/funnel-response',
};

export default function Home() {
  const handleComplete = (data: FunnelResponse) => {
    console.log('Funnel completed:', data);
    // Analytics are automatically tracked
  };

  return (
    <AnalyticsProvider config={maternalFetalFunnel399} trackingConfig={TRACKING_CONFIG}>
      <FunnelProvider config={maternalFetalFunnel399} onComplete={handleComplete}>
        <FunnelRenderer />
      </FunnelProvider>
    </AnalyticsProvider>
  );
}
