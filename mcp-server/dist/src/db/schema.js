"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adImagesRelations = exports.adConceptsRelations = exports.stepViewsRelations = exports.responsesRelations = exports.sessionsRelations = exports.funnelStepsRelations = exports.funnelsRelations = exports.projectsRelations = exports.adImages = exports.adConcepts = exports.stepViews = exports.responses = exports.sessions = exports.funnelSteps = exports.funnels = exports.projects = exports.adImageStatusEnum = exports.adConceptStatusEnum = exports.stepTypeEnum = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
// ── Enums ────────────────────────────────────────────────────────────
exports.stepTypeEnum = (0, pg_core_1.pgEnum)('step_type', [
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
exports.adConceptStatusEnum = (0, pg_core_1.pgEnum)('ad_concept_status', [
    'draft',
    'approved',
    'generated',
]);
exports.adImageStatusEnum = (0, pg_core_1.pgEnum)('ad_image_status', [
    'pending',
    'generated',
    'failed',
]);
// ── Projects ─────────────────────────────────────────────────────────
exports.projects = (0, pg_core_1.pgTable)('projects', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    name: (0, pg_core_1.text)('name').notNull(),
    slug: (0, pg_core_1.text)('slug').notNull().unique(),
    productDescription: (0, pg_core_1.text)('product_description').notNull(),
    targetAudience: (0, pg_core_1.text)('target_audience').notNull(),
    intake: (0, pg_core_1.jsonb)('intake'), // all 10 intake answers
    inferred: (0, pg_core_1.jsonb)('inferred'), // audience, targeting, brand tone
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
// ── Funnels ──────────────────────────────────────────────────────────
exports.funnels = (0, pg_core_1.pgTable)('funnels', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    projectId: (0, pg_core_1.uuid)('project_id').references(() => exports.projects.id, { onDelete: 'set null' }),
    slug: (0, pg_core_1.text)('slug').notNull().unique(), // e.g. "maternal-fetal-399-v1"
    name: (0, pg_core_1.text)('name').notNull(),
    version: (0, pg_core_1.text)('version'),
    priceVariant: (0, pg_core_1.text)('price_variant'),
    theme: (0, pg_core_1.jsonb)('theme').notNull(), // FunnelTheme object
    tracking: (0, pg_core_1.jsonb)('tracking'),
    meta: (0, pg_core_1.jsonb)('meta'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
});
// ── Funnel Steps (questions / info cards / etc.) ─────────────────────
exports.funnelSteps = (0, pg_core_1.pgTable)('funnel_steps', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    funnelId: (0, pg_core_1.uuid)('funnel_id').notNull().references(() => exports.funnels.id, { onDelete: 'cascade' }),
    sortOrder: (0, pg_core_1.integer)('sort_order').notNull(),
    stepId: (0, pg_core_1.text)('step_id').notNull(), // e.g. "pregnancy-status"
    type: (0, exports.stepTypeEnum)('type').notNull(),
    config: (0, pg_core_1.jsonb)('config').notNull(), // type-specific data (question, options, min/max, etc.)
    showIf: (0, pg_core_1.jsonb)('show_if'), // StepCondition | null
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
});
// ── Sessions (one per funnel run) ────────────────────────────────────
exports.sessions = (0, pg_core_1.pgTable)('sessions', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    funnelId: (0, pg_core_1.uuid)('funnel_id').notNull().references(() => exports.funnels.id, { onDelete: 'cascade' }),
    sessionToken: (0, pg_core_1.text)('session_token').notNull().unique(), // client-generated id
    email: (0, pg_core_1.text)('email'),
    ip: (0, pg_core_1.text)('ip'),
    userAgent: (0, pg_core_1.text)('user_agent'),
    utmParams: (0, pg_core_1.jsonb)('utm_params'),
    startedAt: (0, pg_core_1.timestamp)('started_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: (0, pg_core_1.timestamp)('completed_at', { withTimezone: true }),
});
// ── Responses (one per answer) ───────────────────────────────────────
exports.responses = (0, pg_core_1.pgTable)('responses', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    sessionId: (0, pg_core_1.uuid)('session_id').notNull().references(() => exports.sessions.id, { onDelete: 'cascade' }),
    funnelStepId: (0, pg_core_1.uuid)('funnel_step_id').references(() => exports.funnelSteps.id, { onDelete: 'set null' }),
    stepId: (0, pg_core_1.text)('step_id').notNull(), // denormalized for easy querying
    value: (0, pg_core_1.jsonb)('value'), // the actual answer
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)('responses_session_step_idx').on(table.sessionId, table.stepId),
]);
// ── Step Views (analytics) ───────────────────────────────────────────
exports.stepViews = (0, pg_core_1.pgTable)('step_views', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    sessionId: (0, pg_core_1.uuid)('session_id').notNull().references(() => exports.sessions.id, { onDelete: 'cascade' }),
    stepId: (0, pg_core_1.text)('step_id').notNull(),
    stepIndex: (0, pg_core_1.integer)('step_index'),
    stepType: (0, pg_core_1.text)('step_type'),
    viewedAt: (0, pg_core_1.timestamp)('viewed_at', { withTimezone: true }).defaultNow().notNull(),
});
// ── Ad Concepts ──────────────────────────────────────────────────────
exports.adConcepts = (0, pg_core_1.pgTable)('ad_concepts', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    projectId: (0, pg_core_1.uuid)('project_id').notNull().references(() => exports.projects.id, { onDelete: 'cascade' }),
    sortOrder: (0, pg_core_1.integer)('sort_order').notNull().default(0),
    angleName: (0, pg_core_1.text)('angle_name').notNull(),
    angle: (0, pg_core_1.text)('angle').notNull(),
    headline: (0, pg_core_1.text)('headline').notNull(),
    bodyCopy: (0, pg_core_1.text)('body_copy').notNull(),
    cta: (0, pg_core_1.text)('cta').notNull(),
    visualDirection: (0, pg_core_1.text)('visual_direction').notNull(),
    imagePrompt: (0, pg_core_1.text)('image_prompt'), // detailed prompt for image gen
    whyThisWorks: (0, pg_core_1.text)('why_this_works'),
    status: (0, exports.adConceptStatusEnum)('status').notNull().default('draft'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
});
// ── Ad Images ────────────────────────────────────────────────────────
exports.adImages = (0, pg_core_1.pgTable)('ad_images', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    adConceptId: (0, pg_core_1.uuid)('ad_concept_id').notNull().references(() => exports.adConcepts.id, { onDelete: 'cascade' }),
    designJson: (0, pg_core_1.jsonb)('design_json'), // structured design spec (colors, typography, layout, text overlays)
    prompt: (0, pg_core_1.text)('prompt').notNull(),
    blobUrl: (0, pg_core_1.text)('blob_url'),
    blobPathname: (0, pg_core_1.text)('blob_pathname'),
    status: (0, exports.adImageStatusEnum)('status').notNull().default('pending'),
    generationParams: (0, pg_core_1.jsonb)('generation_params'), // aspect_ratio, model, etc.
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
});
// ── Relations (for Drizzle relational queries) ───────────────────────
exports.projectsRelations = (0, drizzle_orm_1.relations)(exports.projects, ({ many }) => ({
    funnels: many(exports.funnels),
    adConcepts: many(exports.adConcepts),
}));
exports.funnelsRelations = (0, drizzle_orm_1.relations)(exports.funnels, ({ one, many }) => ({
    project: one(exports.projects, { fields: [exports.funnels.projectId], references: [exports.projects.id] }),
    steps: many(exports.funnelSteps),
    sessions: many(exports.sessions),
}));
exports.funnelStepsRelations = (0, drizzle_orm_1.relations)(exports.funnelSteps, ({ one }) => ({
    funnel: one(exports.funnels, { fields: [exports.funnelSteps.funnelId], references: [exports.funnels.id] }),
}));
exports.sessionsRelations = (0, drizzle_orm_1.relations)(exports.sessions, ({ one, many }) => ({
    funnel: one(exports.funnels, { fields: [exports.sessions.funnelId], references: [exports.funnels.id] }),
    responses: many(exports.responses),
    stepViews: many(exports.stepViews),
}));
exports.responsesRelations = (0, drizzle_orm_1.relations)(exports.responses, ({ one }) => ({
    session: one(exports.sessions, { fields: [exports.responses.sessionId], references: [exports.sessions.id] }),
    funnelStep: one(exports.funnelSteps, { fields: [exports.responses.funnelStepId], references: [exports.funnelSteps.id] }),
}));
exports.stepViewsRelations = (0, drizzle_orm_1.relations)(exports.stepViews, ({ one }) => ({
    session: one(exports.sessions, { fields: [exports.stepViews.sessionId], references: [exports.sessions.id] }),
}));
exports.adConceptsRelations = (0, drizzle_orm_1.relations)(exports.adConcepts, ({ one, many }) => ({
    project: one(exports.projects, { fields: [exports.adConcepts.projectId], references: [exports.projects.id] }),
    images: many(exports.adImages),
}));
exports.adImagesRelations = (0, drizzle_orm_1.relations)(exports.adImages, ({ one }) => ({
    adConcept: one(exports.adConcepts, { fields: [exports.adImages.adConceptId], references: [exports.adConcepts.id] }),
}));
