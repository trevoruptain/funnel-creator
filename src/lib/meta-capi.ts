import { createHash } from 'crypto';

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '';
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN || '';
const API_VERSION = 'v22.0';

function sha256(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

export interface CAPIUserData {
  email?: string;
  ip?: string;
  userAgent?: string;
  fbc?: string;   // _fbc cookie
  fbp?: string;   // _fbp cookie
}

export interface CAPIEvent {
  eventName: string;
  eventTime?: number;        // unix seconds; defaults to now
  eventId?: string;          // for pixel ↔ CAPI dedup
  eventSourceUrl?: string;
  userData: CAPIUserData;
  customData?: Record<string, unknown>;
}

/**
 * Send one or more conversion events to Meta's Conversions API.
 * Fires and forgets — errors are logged, never thrown to callers.
 */
export async function sendCAPIEvents(events: CAPIEvent[]): Promise<void> {
  if (!PIXEL_ID || !ACCESS_TOKEN) {
    console.warn('[CAPI] Missing META_PIXEL_ID or META_CAPI_ACCESS_TOKEN — skipping');
    return;
  }

  const payload = {
    data: events.map((evt) => {
      const userData: Record<string, unknown> = {};

      if (evt.userData.email) userData.em = [sha256(evt.userData.email)];
      if (evt.userData.ip) userData.client_ip_address = evt.userData.ip;
      if (evt.userData.userAgent) userData.client_user_agent = evt.userData.userAgent;
      if (evt.userData.fbc) userData.fbc = evt.userData.fbc;
      if (evt.userData.fbp) userData.fbp = evt.userData.fbp;

      const entry: Record<string, unknown> = {
        event_name: evt.eventName,
        event_time: evt.eventTime ?? Math.floor(Date.now() / 1000),
        action_source: 'website',
        user_data: userData,
      };

      if (evt.eventSourceUrl) entry.event_source_url = evt.eventSourceUrl;
      if (evt.eventId) entry.event_id = evt.eventId;
      if (evt.customData) entry.custom_data = evt.customData;

      return entry;
    }),
  };

  const url = `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[CAPI] ${res.status} response:`, body);
    }
  } catch (err) {
    console.error('[CAPI] Failed to send events:', err);
  }
}
