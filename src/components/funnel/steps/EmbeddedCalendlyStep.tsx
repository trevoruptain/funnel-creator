'use client';

import type { EmbeddedCalendlyStep } from '@/types/funnel';
import { useEffect, useMemo, useRef } from 'react';
import { useFunnel } from '../FunnelContext';

interface Props {
  step: EmbeddedCalendlyStep;
}

function isCalendlyOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.hostname === 'calendly.com' || url.hostname.endsWith('.calendly.com');
  } catch {
    return false;
  }
}

export function EmbeddedCalendlyStepComponent({ step }: Props) {
  const { goNext, setResponse } = useFunnel();
  const hasAdvancedRef = useRef(false);
  const minHeight = step.minHeight ?? 700;

  const embedUrl = useMemo(() => {
    const separator = step.calendlyUrl.includes('?') ? '&' : '?';
    return `${step.calendlyUrl}${separator}embed_domain=${encodeURIComponent(
      typeof window !== 'undefined' ? window.location.hostname : 'localhost'
    )}&embed_type=Inline`;
  }, [step.calendlyUrl]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!isCalendlyOrigin(event.origin)) return;
      if (!event.data || typeof event.data !== 'object') return;

      const data = event.data as { event?: string; payload?: Record<string, unknown> };
      if (data.event !== 'calendly.event_scheduled') return;
      if (hasAdvancedRef.current) return;
      hasAdvancedRef.current = true;

      setResponse(step.id, {
        scheduled: true,
        source: 'calendly',
        calendlyEvent: data.event,
        payload: data.payload ?? null,
        scheduledAt: new Date().toISOString(),
      });
      goNext();
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [goNext, setResponse, step.id]);

  const handleManualContinue = () => {
    if (hasAdvancedRef.current) return;
    hasAdvancedRef.current = true;
    setResponse(step.id, {
      scheduled: false,
      source: 'manual-continue',
      continuedAt: new Date().toISOString(),
    });
    goNext();
  };

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <h2 className="text-2xl font-bold text-center" style={{ color: 'var(--funnel-text-primary)' }}>
        {step.title}
      </h2>

      {step.subtitle && (
        <p className="text-center" style={{ color: 'var(--funnel-text-secondary)' }}>
          {step.subtitle}
        </p>
      )}

      <div
        className="rounded-2xl overflow-hidden border"
        style={{ borderColor: 'rgba(0,0,0,0.08)', minHeight: `${minHeight}px` }}
      >
        <iframe
          title="Calendly scheduling"
          src={embedUrl}
          className="w-full"
          style={{ minHeight: `${minHeight}px` }}
        />
      </div>

      <button
        onClick={handleManualContinue}
        className="w-full py-3 px-5 rounded-full font-semibold"
        style={{
          backgroundColor: 'var(--funnel-surface)',
          color: 'var(--funnel-text-primary)',
          border: '1px solid rgba(0,0,0,0.12)',
        }}
      >
        {step.continueText ?? 'Continue'}
      </button>
    </div>
  );
}
