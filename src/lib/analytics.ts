/**
 * Aurora Funnel Analytics
 *
 * Unified tracking for Meta Pixel, Google Ads, and custom events.
 */

// Types for tracking events
export interface TrackingEvent {
  event: string;
  data?: Record<string, unknown>;
}

export interface FunnelTrackingConfig {
  metaPixelId?: string;
  googleAdsId?: string;
  googleAnalyticsId?: string;
  apiEndpoint?: string; // Your backend endpoint for storing responses
}

// Extend window for pixel/gtag
declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

// ============================================================
// Meta (Facebook) Pixel
// ============================================================
// Pixel is loaded ONCE in root layout (MetaPixel component).
// Here we only track events — never init.

export function trackMetaEvent(
  eventName: string,
  params?: Record<string, unknown>,
  eventId?: string
) {
  if (typeof window !== 'undefined' && window.fbq) {
    if (eventId) {
      window.fbq('track', eventName, params, { eventID: eventId });
    } else {
      window.fbq('track', eventName, params);
    }
  }
}

export function trackMetaCustomEvent(eventName: string, params?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('trackCustom', eventName, params);
  }
}

// ============================================================
// Google Ads / Analytics (gtag)
// ============================================================

export function initGoogleTag(measurementId: string) {
  if (typeof window === 'undefined' || !measurementId) return;

  // Load gtag script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  // Initialize gtag
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };
  window.gtag('js', new Date());
  window.gtag('config', measurementId);
}

export function trackGoogleEvent(
  eventName: string,
  params?: Record<string, unknown>
) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params);
  }
}

export function trackGoogleConversion(conversionId: string, value?: number) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'conversion', {
      send_to: conversionId,
      value: value,
      currency: 'USD',
    });
  }
}

// ============================================================
// UTM Parameter Handling
// ============================================================

export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  fbclid?: string; // Facebook click ID
  gclid?: string; // Google click ID
}

export function captureUTMParams(): UTMParams {
  if (typeof window === 'undefined') return {};

  const params = new URLSearchParams(window.location.search);
  const utmParams: UTMParams = {};

  const keys: (keyof UTMParams)[] = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'fbclid',
    'gclid',
  ];

  keys.forEach((key) => {
    const value = params.get(key);
    if (value) {
      utmParams[key] = value;
    }
  });

  // Store in sessionStorage for persistence across page loads
  if (Object.keys(utmParams).length > 0) {
    sessionStorage.setItem('aurora_utm', JSON.stringify(utmParams));
  }

  return utmParams;
}

export function getStoredUTMParams(): Record<string, string> {
  if (typeof window === 'undefined') return {};

  const stored = sessionStorage.getItem('aurora_utm');
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as UTMParams;
      // Convert to Record<string, string> by filtering out undefined values
      const result: Record<string, string> = {};
      Object.entries(parsed).forEach(([key, value]) => {
        if (value !== undefined) {
          result[key] = value;
        }
      });
      return result;
    } catch {
      return {};
    }
  }
  return {};
}

// ============================================================
// Meta Cookie / Dedup Helpers
// ============================================================

function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match?.[1];
}

function getMetaCookies() {
  return { fbc: getCookie('_fbc'), fbp: getCookie('_fbp') };
}

// ============================================================
// Unified Funnel Tracking
// ============================================================

class FunnelAnalytics {
  private config: FunnelTrackingConfig = {};
  private funnelId: string = '';
  private sessionId: string = '';
  private lastResponseKey: string = '';

  init(
    config: FunnelTrackingConfig,
    funnelId: string,
    firstStep?: { id: string; type: string }
  ) {
    this.config = config;
    this.funnelId = funnelId;
    this.sessionId = this.generateSessionId();

    // Meta Pixel is loaded once in root layout — never init here
    if (config.googleAdsId || config.googleAnalyticsId) {
      initGoogleTag(config.googleAdsId || config.googleAnalyticsId || '');
    }

    // Capture UTM params on init (before any events)
    captureUTMParams();

    // Track funnel start — include utm and first step_view atomically (avoids race)
    this.trackEvent('funnel_start', {
      funnel_id: funnelId,
      utm: getStoredUTMParams(),
      ...(firstStep && {
        step_view: {
          step_id: firstStep.id,
          step_index: 0,
          step_type: firstStep.type,
        },
      }),
    });
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  // Track step view
  trackStepView(stepId: string, stepIndex: number, stepType: string) {
    const eventData = {
      funnel_id: this.funnelId,
      step_id: stepId,
      step_index: stepIndex,
      step_type: stepType,
      session_id: this.sessionId,
      utm: getStoredUTMParams(),
    };

    // Meta Pixel — send only generic fields (no step_id which reveals health topics)
    trackMetaCustomEvent('FunnelStepView', {
      funnel_id: this.funnelId,
      step_index: stepIndex,
      step_type: stepType,
    });

    // Google
    trackGoogleEvent('funnel_step_view', eventData);

    // Custom tracking
    this.sendToBackend('step_view', eventData);
  }

  // Track answer/response
  trackResponse(stepId: string, response: unknown) {
    // Dedup identical responses (double-tap or StrictMode double-render)
    const key = `${stepId}:${JSON.stringify(response)}`;
    if (key === this.lastResponseKey) return;
    this.lastResponseKey = key;

    const eventData = {
      funnel_id: this.funnelId,
      step_id: stepId,
      response: response,
      session_id: this.sessionId,
      utm: getStoredUTMParams(),
    };

    // Meta Pixel — generic signal only (no step_id or response values)
    trackMetaCustomEvent('FunnelResponse', {
      funnel_id: this.funnelId,
    });

    // Google
    trackGoogleEvent('funnel_response', eventData);

    // Custom tracking
    this.sendToBackend('response', eventData);
  }

  // Track email capture (lead)
  trackLead(email: string, additionalData?: Record<string, unknown>) {
    const eventId = generateEventId();
    const { fbc, fbp } = getMetaCookies();

    const eventData = {
      funnel_id: this.funnelId,
      email: email,
      session_id: this.sessionId,
      utm: getStoredUTMParams(),
      event_id: eventId,
      event_source_url: typeof window !== 'undefined' ? window.location.href : undefined,
      fbc,
      fbp,
      ...additionalData,
    };

    // Meta Pixel — shared event_id for CAPI dedup
    trackMetaEvent('Lead', {
      content_name: this.funnelId,
      content_category: 'funnel_signup',
    }, eventId);

    // Google - Conversion
    trackGoogleEvent('generate_lead', {
      currency: 'USD',
      value: 1,
    });

    // Custom tracking (backend will forward to CAPI)
    this.sendToBackend('lead', eventData);
  }

  // Track funnel completion
  trackCompletion(responses: Record<string, unknown>, email?: string) {
    const eventId = generateEventId();
    const { fbc, fbp } = getMetaCookies();

    const eventData = {
      funnel_id: this.funnelId,
      responses: responses,
      email: email,
      session_id: this.sessionId,
      utm: getStoredUTMParams(),
      completed_at: new Date().toISOString(),
      event_id: eventId,
      event_source_url: typeof window !== 'undefined' ? window.location.href : undefined,
      fbc,
      fbp,
    };

    // Meta Pixel — shared event_id for CAPI dedup
    trackMetaEvent('CompleteRegistration', {
      content_name: this.funnelId,
      status: 'complete',
    }, eventId);

    // Google
    trackGoogleEvent('funnel_complete', eventData);

    // Custom tracking (backend will forward to CAPI)
    this.sendToBackend('complete', eventData);
  }

  // Generic event tracking
  trackEvent(eventName: string, data?: Record<string, unknown>) {
    const eventData = {
      funnel_id: this.funnelId,
      session_id: this.sessionId,
      ...data,
    };

    // Meta Pixel — only generic fields, strip step_id and nested objects
    trackMetaCustomEvent(eventName, { funnel_id: this.funnelId });
    trackGoogleEvent(eventName, eventData);
    this.sendToBackend(eventName, eventData);
  }

  // Send data to your backend
  private async sendToBackend(eventType: string, data: Record<string, unknown>) {
    if (!this.config.apiEndpoint) return;

    try {
      await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: eventType,
          timestamp: new Date().toISOString(),
          ...data,
        }),
      });
    } catch (error) {
      console.error('Failed to send tracking data:', error);
    }
  }
}

// Singleton instance
export const funnelAnalytics = new FunnelAnalytics();
