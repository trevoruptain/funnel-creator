# Data API Reference

Authenticated REST API for accessing funnel session data, responses, and aggregated analytics.

**Base URL:** `https://your-domain.com/api/data`
**Auth:** Pass your API key via the `x-api-key` header on every request.

```bash
curl -H 'x-api-key: YOUR_API_KEY' 'https://your-domain.com/api/data/sessions'
```

---

## Funnel Versioning

Funnels are versioned. Each funnel belongs to a **family** identified by a `base_slug` (e.g. `aurora-399`). Within a family, individual versions are numbered sequentially and have their own slug (e.g. `aurora-399-v1`, `aurora-399-v2`). Exactly one version per family is **published** (live); others are unpublished drafts.

The `funnel` query parameter accepted by all endpoints can be:

| Value | Behaviour |
|-------|-----------|
| `aurora-399-v1` | Exact version — data for that version only |
| `aurora-399` (base slug) | All versions in that family combined |

The stats and admin endpoints additionally accept a `version` parameter to pin to a specific version number without knowing the full slug.

---

## `GET /api/data/sessions`

Returns session-level data. One row per user who started the funnel.

### Query Parameters

| Param    | Type     | Default | Description |
|----------|----------|---------|-------------|
| `funnel` | string   | all     | Filter by funnel slug or base slug (e.g. `aurora-399-v1` or `aurora-399`) |
| `status` | string   | `all`   | `completed`, `incomplete`, or `all` |
| `from`   | ISO date | —       | Sessions started on or after this date |
| `to`     | ISO date | —       | Sessions started on or before this date |
| `limit`  | int      | 200     | Max rows returned (max: 1000) |
| `offset` | int      | 0       | Pagination offset |

### Response

```json
{
  "total": 10,
  "limit": 200,
  "offset": 0,
  "count": 10,
  "sessions": [
    {
      "session_id": "1770896793722-iqkj9o1",
      "funnel_slug": "aurora-399-v1",
      "funnel_name": "Discover Aurora",
      "price_variant": "399",
      "email": "john@doe.com",
      "ip": "::1",
      "user_agent": "Mozilla/5.0 ...",
      "utm_params": null,
      "started_at": "2026-02-12T11:58:25.680Z",
      "completed_at": "2026-02-12T12:02:35.000Z",
      "is_completed": true
    }
  ]
}
```

---

## `GET /api/data/responses`

Flat export of every response — one row per (session, question) pair. Ideal for spreadsheets and BI tools.

### Query Parameters

| Param    | Type     | Default | Description |
|----------|----------|---------|-------------|
| `funnel` | string   | all     | Filter by funnel slug or base slug |
| `step`   | string   | all     | Filter by step ID (e.g. `pregnancy-status`) |
| `from`   | ISO date | —       | Responses created on or after |
| `to`     | ISO date | —       | Responses created on or before |
| `limit`  | int      | 500     | Max rows (max: 5000) |
| `offset` | int      | 0       | Pagination offset |

### Response

```json
{
  "total": 11,
  "limit": 500,
  "offset": 0,
  "count": 11,
  "responses": [
    {
      "session_token": "1770896793722-iqkj9o1",
      "email": "john@doe.com",
      "step_id": "pregnancy-status",
      "value": "pregnant",
      "responded_at": "2026-02-12T11:59:01.000Z",
      "session_started_at": "2026-02-12T11:58:25.680Z",
      "session_completed_at": "2026-02-12T12:02:35.000Z",
      "ip": "::1",
      "utm_params": null
    }
  ]
}
```

**Note:** `value` is polymorphic — it can be a string (`"pregnant"`), number (`64`), array (`["doctor","app"]`), or object (`{"price": 399, "reserved": true}`).

---

## `GET /api/data/stats`

Aggregated funnel metrics for dashboards. Returns everything needed to build completion funnels, drop-off charts, and answer distribution visualizations.

### Query Parameters

| Param          | Type     | Required | Description |
|----------------|----------|----------|-------------|
| `funnel`       | string   | **yes**  | Base slug (e.g. `aurora-399`) or exact version slug (e.g. `aurora-399-v1`) |
| `version`      | int      | no       | Pin to a specific version number (e.g. `2`). Ignored when `funnel` is an exact versioned slug. When omitted with a base slug, all versions are aggregated. |
| `from`         | ISO date | **yes**  | Sessions started on or after |
| `to`           | ISO date | **yes**  | Sessions started on or before |
| `filter_step`  | string   | no       | Step ID of a branching question (e.g. `pregnancy-status`). Must be combined with `filter_value`. |
| `filter_value` | string   | no       | Option value to segment by (e.g. `pregnant`). Only sessions where this step has this answer are included. |

### Version resolution logic

| `funnel` value | `version` value | Result |
|----------------|-----------------|--------|
| `aurora-399` (base slug) | omitted | All versions aggregated |
| `aurora-399` (base slug) | `2` | Version 2 only (`aurora-399-v2`) |
| `aurora-399-v1` (exact slug) | any / omitted | Version 1 only — `version` param is ignored |

### Response

```json
{
  "funnel": {
    "base_slug": "aurora-399",
    "name": "Discover Aurora",
    "price_variant": "399",
    "is_aggregated": false,
    "versions_included": [1],
    "slug": "aurora-399-v1",
    "version_number": 1,
    "is_published": true
  },
  "date_range": {
    "from": "2026-02-12T11:58:25.680Z",
    "to": "2026-02-12T12:25:54.354Z"
  },
  "overview": {
    "total_sessions": 10,
    "total_responses": 87,
    "completed_sessions": 1,
    "completion_rate": 0.1,
    "unique_emails": 1
  },
  "step_drop_off": [
    {
      "step_id": "pregnancy-status",
      "step_type": "multiple-choice",
      "sort_order": 1,
      "views": 10,
      "answers": 9,
      "drop_off_rate": 0.1
    },
    {
      "step_id": "gender",
      "step_type": "multiple-choice",
      "sort_order": 3,
      "views": 9,
      "answers": 9,
      "drop_off_rate": 0
    }
  ],
  "answer_distributions": {
    "pregnancy-status": [
      { "value": "pregnant", "count": 7 },
      { "value": "trying", "count": 2 }
    ],
    "gender": [
      { "value": "female", "count": 9 }
    ],
    "height": [
      { "value": 64, "count": 3 }
    ],
    "current-monitoring": [
      { "value": ["doppler", "app"], "count": 4 }
    ]
  }
}
```

### Key Fields

- **`funnel.is_aggregated`** — `true` when data spans multiple versions (no `version` param with a base slug)
- **`funnel.versions_included`** — array of version numbers whose sessions are included in this response
- **`funnel.slug`** / **`funnel.version_number`** / **`funnel.is_published`** — `null` when `is_aggregated` is true
- **`overview.completion_rate`** — ratio of completed sessions to total (0–1)
- **`step_drop_off[].drop_off_rate`** — ratio of users who viewed but did not answer (0–1). `null` for steps with 0 views.
- **`answer_distributions`** — per-question breakdown of answer counts, sorted by popularity (most common first)

### Path segmentation (`filter_step` + `filter_value`)

When a funnel has conditional steps (steps with `showIf` logic), the step drop-off chart can be ambiguous because different users see different branches. Use `filter_step` and `filter_value` together to scope the response to a single path:

```bash
# Only sessions where users answered "pregnant" to the pregnancy-status step
curl '.../api/data/stats?funnel=aurora-399&version=1&from=...&to=...&filter_step=pregnancy-status&filter_value=pregnant'
```

When path filtering is active:
- **`overview`** counts only sessions that answered `filter_value` at `filter_step`
- **`step_drop_off`** excludes steps whose `showIf` condition targets a different branch (so only the steps relevant to that path appear)
- **`answer_distributions`** is likewise scoped to those sessions

Use `GET /api/admin/dashboard/paths` to discover which branching steps and values are available for a given funnel version.

---

## Admin-only Endpoints

These endpoints require an `admin_auth=authenticated` session cookie. They power the admin dashboard.

### `GET /api/admin/dashboard/funnels`

Returns all funnel families with their versions. Used to populate version selectors.

#### Response

```json
{
  "funnels": [
    {
      "baseSlug": "aurora-399",
      "name": "Discover Aurora",
      "publishedVersion": 1,
      "versions": [
        { "slug": "aurora-399-v1", "versionNumber": 1, "isPublished": true },
        { "slug": "aurora-399-v2", "versionNumber": 2, "isPublished": false }
      ]
    }
  ]
}
```

Families are sorted by the oldest version's `createdAt` — the most established funnel appears first.

---

### `GET /api/admin/dashboard/paths`

Returns the branching path segments for a funnel version. Used to populate the "Path segment" filter in the dashboard.

#### Query Parameters

| Param     | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `funnel`  | string | **yes**  | Base slug or exact version slug |
| `version` | int    | no       | Version number (same resolution logic as stats) |

#### Response

```json
{
  "paths": [
    {
      "stepId": "pregnancy-status",
      "stepLabel": "Pregnancy Status",
      "options": [
        { "value": "pregnant", "label": "Currently pregnant" },
        { "value": "trying", "label": "Trying to conceive" }
      ]
    }
  ]
}
```

- **`paths`** is empty (`[]`) when the funnel has no conditional steps.
- Only options that are actually referenced by at least one `showIf` condition are returned (not all options on the question).

---

### `GET /api/admin/dashboard/stats`

Same contract as `GET /api/data/stats` above but admin-authenticated. Accepts the same parameters including `version`, `filter_step`, and `filter_value`.

---

## Funnel Slugs

| Base Slug | Published Slug | Name | Price Variant |
|-----------|---------------|------|--------------|
| `aurora-399` | `aurora-399-v1` | Discover Aurora | $399 |
| `aurora` | `aurora-v1` | Discover Aurora | — |

---

## Question Step Types

| Type | Value Format | Example |
|------|-------------|---------|
| `multiple-choice` | string | `"pregnant"` |
| `checkboxes` | string[] | `["doctor", "app"]` |
| `number-picker` | number | `64` |
| `email` | string | `"user@example.com"` |
| `text-input` | string | `"free text answer"` |
| `checkout` | object | `{"price": 399, "reserved": true}` |
| `info-card` | — | No response recorded |
| `welcome` | — | No response recorded |
| `result` | — | No response recorded |
