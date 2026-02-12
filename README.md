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
GOOGLE_API_KEY=your-gemini-api-key
```

Push the schema and seed funnel data:

```bash
npm run db:push
npm run db:seed
```

Run locally:

```bash
npm run dev
```

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

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run db:push` | Push schema to Neon |
| `npm run db:seed` | Seed funnel configs |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:generate` | Generate migrations |

## Stack

- **Next.js 16** — App Router, API routes
- **Neon** — Serverless Postgres
- **Drizzle ORM** — Type-safe schema & queries
- **Gemini 3 Pro** — AI image generation
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
