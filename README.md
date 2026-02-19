# Aurora Funnel Creator

JSON-driven quiz funnels for market validation. Built with Next.js, Neon Postgres, and Drizzle ORM.

## Setup

```bash
npm install
```

Create `.env.local`:

```
DATABASE_URL=your-neon-connection-string
DATA_API_KEY=your-secret-key
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token

# Vertex AI (Gemini) - uses service account JSON, not API key
GOOGLE_CLOUD_PROJECT=your-gcp-project
GOOGLE_CLOUD_LOCATION=global
GOOGLE_APPLICATION_CREDENTIALS=./credentials/vertexai-credentials.json
```

Create `credentials/` and place your GCP service account JSON there as `vertexai-credentials.json`. The service account needs the **Vertex AI User** role.

`GOOGLE_API_KEY` / `GEMINI_API_KEY` are not used; remove them from `.env.local` if present.

Optional (tracking): `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_GOOGLE_ADS_ID`

Push the schema:

```bash
npm run db:push
```

Run locally:

```bash
npm run dev
```

## Editing Funnels

Funnels are stored in the database and loaded dynamically. To edit funnel content:

### Using Drizzle Studio (Recommended)

1. Start the database GUI:
   ```bash
   npm run db:studio
   ```

2. Navigate to the `funnel_steps` table

3. Edit the `config` JSONB column for any step:
   - Title, subtitle, descriptions
   - Button text
   - Options for multiple choice/checkboxes
   - Images and styling
   - Any step-specific configuration

4. Changes take effect immediately (refresh the browser)

### Using SQL

For bulk updates, you can run SQL scripts:

```bash
psql $DATABASE_URL -f your-changes.sql
```

Example: Update a welcome step title:
```sql
UPDATE funnel_steps
SET config = jsonb_set(config, '{title}', '"New Title"')
WHERE step_id = 'welcome' AND funnel_id = (
  SELECT id FROM funnels WHERE slug = 'your-funnel-slug'
);
```

### Funnel Selection

Load specific funnels via URL parameter:
- `http://localhost:3000/?funnel=maternal-fetal-399-v1`
- `http://localhost:3000/?funnel=another-funnel-slug`

Default funnel (when no parameter): `maternal-fetal-399-v1`

## MCP Server (Claude Code)

An MCP server at `mcp-server/index.ts` gives Claude Code tools for creating ad projects, generating images with Gemini 3 Pro, and uploading to Vercel Blob.

Add the server to Claude Code from the project root:

```bash
claude mcp add funnel-creator npx tsx ./mcp-server/index.ts
```

Or to add it globally (available in all projects):

```bash
claude mcp add --scope user funnel-creator npx tsx /absolute/path/to/funnel-creator/mcp-server/index.ts
```

Env vars are loaded from `.env.local` automatically.

**Available tools:** `create_project`, `add_ad_concepts`, `generate_ad_image`, `get_project`, `list_projects`

Use the `/ad-pipeline` skill to run the full intake → concepts → image gen workflow.

### Claude Desktop (standalone app)

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (merge into existing `mcpServers`). Claude Desktop will run the server automatically when you start a conversation — no manual step.

```json
"funnel-creator": {
  "command": "/bin/bash",
  "args": ["/absolute/path/to/funnel-creator/mcp-server/run-mcp.sh"],
  "cwd": "/absolute/path/to/funnel-creator"
}
```

See [claude_desktop_config.example.json](claude_desktop_config.example.json) for a full example. The wrapper script ensures Node 18+ is used (required by dependencies). Replace `/absolute/path/to/funnel-creator` with your actual project path.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run db:push` | Push schema to Neon |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:generate` | Generate migrations |
| `npm run test:ad-gen` | Run ad generation integration test |
| `npm run verify-tracking` | Verify funnel tracking endpoints |

## Stack

- **Next.js 16** — App Router, API routes
- **Neon** — Serverless Postgres
- **Drizzle ORM** — Type-safe schema & queries
- **Vertex AI** — Gemini 3 Pro Image (ad creative generation)
- **Vercel Blob** — Image storage
- **Framer Motion** — Step animations
- **Tailwind CSS** — Styling

## Data API

Authenticated endpoints for the data team at `/api/data/`. See [docs/DATA_API.md](docs/DATA_API.md) for full reference.

| Endpoint | Description |
|----------|-------------|
| `GET /api/data/sessions` | Session list with filters |
| `GET /api/data/responses` | Flat response export |
| `GET /api/data/stats` | Aggregated funnel metrics |
| `GET /api/data/projects` | Projects with concept/image counts |
