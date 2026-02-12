import { relations } from 'drizzle-orm';
import { integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

// ── Enums ────────────────────────────────────────────────────────────
export const stepTypeEnum = pgEnum('step_type', [
    'welcome',
    'multiple-choice',
    'checkboxes',
    'email',
    'text-input',
    'number-picker',
    'info-card',
    'checkout',
    'result',
]);

// ── Funnels ──────────────────────────────────────────────────────────
export const funnels = pgTable('funnels', {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: text('slug').notNull().unique(),           // e.g. "maternal-fetal-399-v1"
    name: text('name').notNull(),
    version: text('version'),
    priceVariant: text('price_variant'),
    theme: jsonb('theme').notNull(),                 // FunnelTheme object
    tracking: jsonb('tracking'),
    meta: jsonb('meta'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Funnel Steps (questions / info cards / etc.) ─────────────────────
export const funnelSteps = pgTable('funnel_steps', {
    id: uuid('id').defaultRandom().primaryKey(),
    funnelId: uuid('funnel_id').notNull().references(() => funnels.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull(),
    stepId: text('step_id').notNull(),               // e.g. "pregnancy-status"
    type: stepTypeEnum('type').notNull(),
    config: jsonb('config').notNull(),               // type-specific data (question, options, min/max, etc.)
    showIf: jsonb('show_if'),                        // StepCondition | null
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Sessions (one per funnel run) ────────────────────────────────────
export const sessions = pgTable('sessions', {
    id: uuid('id').defaultRandom().primaryKey(),
    funnelId: uuid('funnel_id').notNull().references(() => funnels.id, { onDelete: 'cascade' }),
    sessionToken: text('session_token').notNull().unique(),  // client-generated id
    email: text('email'),
    ip: text('ip'),
    userAgent: text('user_agent'),
    utmParams: jsonb('utm_params'),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
});

// ── Responses (one per answer) ───────────────────────────────────────
export const responses = pgTable('responses', {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),
    funnelStepId: uuid('funnel_step_id').references(() => funnelSteps.id, { onDelete: 'set null' }),
    stepId: text('step_id').notNull(),               // denormalized for easy querying
    value: jsonb('value'),                           // the actual answer
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    uniqueIndex('responses_session_step_idx').on(table.sessionId, table.stepId),
]);

// ── Step Views (analytics) ───────────────────────────────────────────
export const stepViews = pgTable('step_views', {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),
    stepId: text('step_id').notNull(),
    stepIndex: integer('step_index'),
    stepType: text('step_type'),
    viewedAt: timestamp('viewed_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Relations (for Drizzle relational queries) ───────────────────────
export const funnelsRelations = relations(funnels, ({ many }) => ({
    steps: many(funnelSteps),
    sessions: many(sessions),
}));

export const funnelStepsRelations = relations(funnelSteps, ({ one }) => ({
    funnel: one(funnels, { fields: [funnelSteps.funnelId], references: [funnels.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
    funnel: one(funnels, { fields: [sessions.funnelId], references: [funnels.id] }),
    responses: many(responses),
    stepViews: many(stepViews),
}));

export const responsesRelations = relations(responses, ({ one }) => ({
    session: one(sessions, { fields: [responses.sessionId], references: [sessions.id] }),
    funnelStep: one(funnelSteps, { fields: [responses.funnelStepId], references: [funnelSteps.id] }),
}));

export const stepViewsRelations = relations(stepViews, ({ one }) => ({
    session: one(sessions, { fields: [stepViews.sessionId], references: [sessions.id] }),
}));

