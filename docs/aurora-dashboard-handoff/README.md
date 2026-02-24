# Aurora Funnel Dashboard — Setup Guide

## Quick Start

```bash
cd aurora-dashboard-handoff
python3 serve.py
# Open http://localhost:8741 in your browser
```

That's it. The dashboard will load live data from the Aurora API.

---

## What's in This Folder

| File | Purpose |
|------|---------|
| `aurora-funnel-dashboard.html` | The dashboard UI — all HTML/CSS/JS in one file |
| `serve.py` | Local Python proxy server (no dependencies beyond Python 3) |
| `DATA_API.md` | Full API reference for `auroramirror.com/api/data` |
| `README.md` | This file |

---

## How It Works

The dashboard fetches live data from `https://auroramirror.com/api/data`. Because browsers block cross-origin API calls (CORS), `serve.py` acts as a local proxy:

```
Browser (localhost:8741)  -->  serve.py  -->  auroramirror.com/api/data
         HTML served           proxy           real API (with key)
```

- `serve.py` serves the dashboard HTML at `http://localhost:8741`
- It proxies any request to `/api/data/*` to the real API, adding the `x-api-key` header server-side
- The API key is stored in `serve.py` (line 14) — never exposed to the browser

### Fallback / Cached Data

If the live API is unreachable (firewall, downtime, etc.), the dashboard automatically falls back to a **cached data snapshot from Feb 12-18, 2026** and shows a yellow banner indicating stale data. Click "Retry now" or "Refresh" to re-attempt the live API.

---

## API Details

- **Base URL:** `https://auroramirror.com/api/data`
- **Auth:** `x-api-key` header
- **API Key:** See `serve.py` line 14
- **Funnel slug:** `maternal-fetal-v1` (Discover Aurora)

### Key Endpoints

| Endpoint | Returns |
|----------|---------|
| `GET /api/data/stats?funnel=maternal-fetal-v1` | Aggregated metrics, step drop-off, answer distributions |
| `GET /api/data/sessions?funnel=maternal-fetal-v1&limit=500` | Session-level data |
| `GET /api/data/responses?funnel=maternal-fetal-v1` | Per-question response rows |

### Testing API Access

Before running the dashboard, verify you can reach the API:

```bash
curl -H "x-api-key: $(python3 -c "exec(open('serve.py').read()); print(API_KEY)")" \
  "https://auroramirror.com/api/data/stats?funnel=maternal-fetal-v1"
```

You should get a JSON response with `overview`, `step_drop_off`, and `answer_distributions`. If you get a connection error, the API may be firewalled on your network.

---

## What the Dashboard Shows

**Live from API:**
- Overview metrics: total sessions, responses, completions, completion rate, unique emails
- Funnel waterfall: sequential step-by-step drop-off
- Answer distributions: feature interest, monitoring gaps, importance rating, plus audience demographics
- Audience profile: top answer per question (gender, pregnancy status, trimester, etc.)
- Sessions by day (sparkline)
- Recent sessions table

**Static (baked into HTML — from Feb 12-18 Meta Ads Manager data):**
- Meta Pixel vs Backend comparison table
- Ad performance vs launch plan benchmarks
- Prioritized action items

---

## Customization Notes

- **Adding funnel variants:** Add `<option>` elements to the `#sel-funnel` select in the HTML. The value should match the funnel slug from the API.
- **Updating cached data:** The `CACHED_STATS` and `CACHED_SESSIONS` objects near the top of the `<script>` block contain the fallback data. Update these if you want to bake in a newer snapshot.
- **Changing the port:** Edit `PORT` in `serve.py` (line 13).
- **Brand colors:** CSS variables at the top of the `<style>` block use the Aurora gradient: `#b55600 -> #b8003c -> #7c0667 -> #45108d -> #1753a0 -> #0590b9`.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Address already in use` | Another process is on port 8741. Run: `lsof -ti:8741 \| xargs kill` |
| CORS error in browser console | You opened the HTML file directly (`file://`). Use `http://localhost:8741` instead. |
| API returns connection error | The API may be firewalled. The dashboard will fall back to cached data automatically. |
| `python3: command not found` | Install Python 3. No pip packages are required. |

---

## Requirements

- Python 3.6+ (no pip packages needed)
- Network access to `auroramirror.com` (for live data; cached fallback works without it)
