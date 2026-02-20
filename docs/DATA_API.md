# Data API Reference

Authenticated REST API for accessing funnel session data, responses, and aggregated analytics.

**Base URL:** `https://your-domain.com/api/data`
**Auth:** Pass your API key via the `x-api-key` header on every request.

```bash
curl -H 'x-api-key: YOUR_API_KEY' 'https://your-domain.com/api/data/sessions'
```

---

## `GET /api/data/sessions`

Returns session-level data. One row per user who started the funnel.

### Query Parameters

| Param    | Type   | Default | Description |
|----------|--------|---------|-------------|
| `funnel` | string | all     | Filter by funnel slug (e.g. `aurora-399-v1`) |
| `status` | string | `all`   | `completed`, `incomplete`, or `all` |
| `from`   | ISO date | —     | Sessions started on or after this date |
| `to`     | ISO date | —     | Sessions started on or before this date |
| `limit`  | int    | 200     | Max rows returned (max: 1000) |
| `offset` | int    | 0       | Pagination offset |

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

| Param    | Type   | Default | Description |
|----------|--------|---------|-------------|
| `funnel` | string | all     | Filter by funnel slug |
| `step`   | string | all     | Filter by step ID (e.g. `pregnancy-status`) |
| `from`   | ISO date | —     | Responses created on or after |
| `to`     | ISO date | —     | Responses created on or before |
| `limit`  | int    | 500     | Max rows (max: 5000) |
| `offset` | int    | 0       | Pagination offset |

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

| Param    | Type   | Required | Description |
|----------|--------|----------|-------------|
| `funnel` | string | **yes**  | Funnel slug |
| `from`   | ISO date | no     | Sessions started on or after |
| `to`     | ISO date | no     | Sessions started on or before |

### Response

```json
{
  "funnel": {
    "slug": "aurora-399-v1",
    "name": "Discover Aurora",
    "price_variant": "399"
  },
  "date_range": {
    "from": "2026-02-12T11:58:25.680Z",
    "to": "2026-02-12T12:25:54.354Z"
  },
  "overview": {
    "total_sessions": 10,
    "completed_sessions": 1,
    "completion_rate": 0.1,
    "unique_emails": 1
  },
  "step_drop_off": [
    {
      "step_id": "pregnancy-status",
      "step_type": "multiple-choice",
      "sort_order": 1,
      "views": 1,
      "answers": 1,
      "drop_off_rate": 0
    },
    {
      "step_id": "gender",
      "step_type": "multiple-choice",
      "sort_order": 3,
      "views": 1,
      "answers": 1,
      "drop_off_rate": 0
    }
  ],
  "answer_distributions": {
    "pregnancy-status": [
      { "value": "pregnant", "count": 1 }
    ],
    "gender": [
      { "value": "male", "count": 1 }
    ],
    "height": [
      { "value": 64, "count": 1 }
    ],
    "current-monitoring": [
      { "value": ["doppler", "app"], "count": 1 }
    ]
  }
}
```

### Key Fields

- **`overview.completion_rate`** — ratio of completed sessions to total (0–1)
- **`step_drop_off[].drop_off_rate`** — ratio of users who viewed but did not answer (0–1). `null` for steps with 0 views.
- **`answer_distributions`** — per-question breakdown of answer counts, sorted by popularity (most common first)

---

## Funnel Slugs

| Slug | Name | Price Variant |
|------|------|--------------|
| `aurora-399-v1` | Discover Aurora | $399 |
| `aurora-v1` | Discover Aurora | — |

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
