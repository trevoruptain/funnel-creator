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

export function initMetaPixel(pixelId: string) {
  if (typeof window === 'undefined' || !pixelId) return;

  // Load Meta Pixel script
  const script = document.createElement('script');
  script.innerHTML = `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${pixelId}');
    fbq('track', 'PageView');
  `;
  document.head.appendChild(script);
}

export function trackMetaEvent(eventName: string, params?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', eventName, params);
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
// Unified Funnel Tracking
// ============================================================

class FunnelAnalytics {
  private config: FunnelTrackingConfig = {};
  private funnelId: string = '';
  private sessionId: string = '';

  init(config: FunnelTrackingConfig, funnelId: string) {
    this.config = config;
    this.funnelId = funnelId;
    this.sessionId = this.generateSessionId();

    // Initialize tracking pixels
    if (config.metaPixelId) {
      initMetaPixel(config.metaPixelId);
    }
    if (config.googleAdsId || config.googleAnalyticsId) {
      initGoogleTag(config.googleAdsId || config.googleAnalyticsId || '');
    }

    // Capture UTM params on init
    captureUTMParams();

    // Track funnel start
    this.trackEvent('funnel_start', { funnel_id: funnelId });
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
    };

    // Meta Pixel
    trackMetaCustomEvent('FunnelStepView', eventData);

    // Google
    trackGoogleEvent('funnel_step_view', eventData);

    // Custom tracking
    this.sendToBackend('step_view', eventData);
  }

  // Track answer/response
  trackResponse(stepId: string, response: unknown) {
    const eventData = {
      funnel_id: this.funnelId,
      step_id: stepId,
      response: response,
      session_id: this.sessionId,
    };

    // Meta Pixel
    trackMetaCustomEvent('FunnelResponse', eventData);

    // Google
    trackGoogleEvent('funnel_response', eventData);

    // Custom tracking
    this.sendToBackend('response', eventData);
  }

  // Track email capture (lead)
  trackLead(email: string, additionalData?: Record<string, unknown>) {
    const eventData = {
      funnel_id: this.funnelId,
      email: email,
      session_id: this.sessionId,
      utm: getStoredUTMParams(),
      ...additionalData,
    };

    // Meta Pixel - Standard Lead event
    trackMetaEvent('Lead', {
      content_name: this.funnelId,
      content_category: 'funnel_signup',
    });

    // Google - Conversion
    trackGoogleEvent('generate_lead', {
      currency: 'USD',
      value: 1, // Assign a value to leads for ROAS calculation
    });

    // Custom tracking
    this.sendToBackend('lead', eventData);
  }

  // Track funnel completion
  trackCompletion(responses: Record<string, unknown>, email?: string) {
    const eventData = {
      funnel_id: this.funnelId,
      responses: responses,
      email: email,
      session_id: this.sessionId,
      utm: getStoredUTMParams(),
      completed_at: new Date().toISOString(),
    };

    // Meta Pixel - CompleteRegistration
    trackMetaEvent('CompleteRegistration', {
      content_name: this.funnelId,
      status: 'complete',
    });

    // Google
    trackGoogleEvent('funnel_complete', eventData);

    // Custom tracking - send full response data
    this.sendToBackend('complete', eventData);
  }

  // Generic event tracking
  trackEvent(eventName: string, data?: Record<string, unknown>) {
    const eventData = {
      funnel_id: this.funnelId,
      session_id: this.sessionId,
      ...data,
    };

    trackMetaCustomEvent(eventName, eventData);
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
