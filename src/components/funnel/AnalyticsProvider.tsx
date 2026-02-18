'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { funnelAnalytics, FunnelTrackingConfig } from '@/lib/analytics';
import type { FunnelConfig } from '@/types/funnel';

interface AnalyticsContextValue {
  trackStepView: (stepId: string, stepIndex: number, stepType: string) => void;
  trackResponse: (stepId: string, response: unknown) => void;
  trackLead: (email: string, additionalData?: Record<string, unknown>) => void;
  trackCompletion: (responses: Record<string, unknown>, email?: string) => void;
  trackEvent: (eventName: string, data?: Record<string, unknown>) => void;
}

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

interface AnalyticsProviderProps {
  config: FunnelConfig;
  trackingConfig?: FunnelTrackingConfig;
  children: ReactNode;
}

export function AnalyticsProvider({
  config,
  trackingConfig,
  children,
}: AnalyticsProviderProps) {
  useEffect(() => {
    // Initialize analytics on mount
    const firstStep = config.steps?.[0];
    funnelAnalytics.init(
      {
        metaPixelId: trackingConfig?.metaPixelId || config.tracking?.pixelId,
        googleAdsId: trackingConfig?.googleAdsId || config.tracking?.gtmId,
        apiEndpoint: trackingConfig?.apiEndpoint,
      },
      config.id,
      firstStep ? { id: firstStep.id, type: firstStep.type } : undefined
    );
  }, [config, trackingConfig]);

  const value: AnalyticsContextValue = {
    trackStepView: (stepId, stepIndex, stepType) =>
      funnelAnalytics.trackStepView(stepId, stepIndex, stepType),
    trackResponse: (stepId, response) =>
      funnelAnalytics.trackResponse(stepId, response),
    trackLead: (email, additionalData) =>
      funnelAnalytics.trackLead(email, additionalData),
    trackCompletion: (responses, email) =>
      funnelAnalytics.trackCompletion(responses, email),
    trackEvent: (eventName, data) => funnelAnalytics.trackEvent(eventName, data),
  };

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (!context) {
    // Return no-op functions if used outside provider
    return {
      trackStepView: () => {},
      trackResponse: () => {},
      trackLead: () => {},
      trackCompletion: () => {},
      trackEvent: () => {},
    };
  }
  return context;
}
