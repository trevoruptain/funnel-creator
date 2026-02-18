import { db } from '@/db';
import { funnelSteps, funnels, responses, sessions, stepViews } from '@/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    if (!data.type) {
      return NextResponse.json({ error: 'Missing event type' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    switch (data.type) {
      // ── Funnel Start ───────────────────────────────────────────
      case 'funnel_start': {
        // Look up funnel by slug
        const funnel = await db.query.funnels.findFirst({
          where: eq(funnels.slug, data.funnel_id),
        });

        if (!funnel) {
          return NextResponse.json({ error: `Funnel not found: ${data.funnel_id}` }, { status: 404 });
        }

        const [insertedSession] = await db
          .insert(sessions)
          .values({
            funnelId: funnel.id,
            sessionToken: data.session_id,
            ip,
            userAgent,
            utmParams: data.utm && Object.keys(data.utm).length > 0 ? data.utm : null,
          })
          .onConflictDoNothing({ target: sessions.sessionToken })
          .returning({ id: sessions.id });

        // Atomic first step_view: avoids race where step_view arrives before session exists
        if (insertedSession && data.step_view) {
          await db.insert(stepViews).values({
            sessionId: insertedSession.id,
            stepId: data.step_view.step_id,
            stepIndex: data.step_view.step_index ?? 0,
            stepType: data.step_view.step_type,
          });
        }

        console.log(`[Funnel Start] ${data.funnel_id} session=${data.session_id}`);
        break;
      }

      // ── Step View ──────────────────────────────────────────────
      case 'step_view': {
        let session = await db.query.sessions.findFirst({
          where: eq(sessions.sessionToken, data.session_id),
        });

        // Race fix: if funnel_start hasn't created the session yet, create it now
        if (!session && data.funnel_id) {
          const funnel = await db.query.funnels.findFirst({
            where: eq(funnels.slug, data.funnel_id),
          });
          if (funnel) {
            await db
              .insert(sessions)
              .values({
                funnelId: funnel.id,
                sessionToken: data.session_id,
                ip,
                userAgent,
                utmParams: data.utm && Object.keys(data.utm).length > 0 ? data.utm : null,
              })
              .onConflictDoNothing({ target: sessions.sessionToken });
            session = await db.query.sessions.findFirst({
              where: eq(sessions.sessionToken, data.session_id),
            });
          }
        }

        if (session) {
          // Backfill utm_params if session has none (e.g. funnel_start raced)
          if (!session.utmParams && data.utm && Object.keys(data.utm).length > 0) {
            await db
              .update(sessions)
              .set({ utmParams: data.utm })
              .where(eq(sessions.id, session.id));
          }

          await db.insert(stepViews).values({
            sessionId: session.id,
            stepId: data.step_id,
            stepIndex: data.step_index,
            stepType: data.step_type,
          });
        }
        break;
      }

      // ── Response ───────────────────────────────────────────────
      case 'response': {
        const session = await db.query.sessions.findFirst({
          where: eq(sessions.sessionToken, data.session_id),
        });

        if (session) {
          // Backfill utm_params if missing (handles any race)
          if (!session.utmParams && data.utm && Object.keys(data.utm).length > 0) {
            await db
              .update(sessions)
              .set({ utmParams: data.utm })
              .where(eq(sessions.id, session.id));
          }

          // Resolve the actual funnel step record (the UUID)
          const funnelStep = await db.query.funnelSteps.findFirst({
            where: and(
              eq(funnelSteps.funnelId, session.funnelId),
              eq(funnelSteps.stepId, data.step_id)
            ),
          });

          // Upsert — overwrite if they re-answer the same step
          await db
            .insert(responses)
            .values({
              sessionId: session.id,
              funnelStepId: funnelStep?.id ?? null,
              stepId: data.step_id,
              value: data.response,
            })
            .onConflictDoUpdate({
              target: [responses.sessionId, responses.stepId],
              set: {
                value: data.response,
                funnelStepId: funnelStep?.id ?? null,
                createdAt: new Date()
              },
            });
        }
        break;
      }

      // ── Lead / Complete ────────────────────────────────────────
      case 'lead':
      case 'complete': {
        const session = await db.query.sessions.findFirst({
          where: eq(sessions.sessionToken, data.session_id),
        });

        if (session) {
          await db
            .update(sessions)
            .set({
              email: data.email ?? session.email,
              completedAt: data.type === 'complete' ? new Date() : session.completedAt,
              utmParams: data.utm ?? session.utmParams,
            })
            .where(eq(sessions.id, session.id));
        }

        console.log(`[Funnel ${data.type}] session=${data.session_id} email=${data.email ? '***' : 'n/a'}`);
        break;
      }

      default:
        console.log(`[Funnel Event] Unknown type: ${data.type}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error storing funnel response:', error);
    return NextResponse.json({ error: 'Failed to store response' }, { status: 500 });
  }
}

// GET endpoint — retrieve sessions & responses for admin
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const funnelSlug = searchParams.get('funnel');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build query
    let whereClause;
    if (funnelSlug) {
      const funnel = await db.query.funnels.findFirst({
        where: eq(funnels.slug, funnelSlug),
      });
      if (funnel) {
        whereClause = eq(sessions.funnelId, funnel.id);
      }
    }

    const results = await db.query.sessions.findMany({
      where: whereClause,
      orderBy: [desc(sessions.startedAt)],
      limit,
      with: {
        responses: true,
        stepViews: true,
      },
    });

    return NextResponse.json({
      count: results.length,
      sessions: results,
    });
  } catch (error) {
    console.error('Error reading funnel responses:', error);
    return NextResponse.json({ error: 'Failed to read responses' }, { status: 500 });
  }
}
