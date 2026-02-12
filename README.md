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
- **Framer Motion** — Step animations
- **Tailwind CSS** — Styling

## Data API

Authenticated endpoints for the data team at `/api/data/`. See [docs/DATA_API.md](docs/DATA_API.md) for full reference.

| Endpoint | Description |
|----------|-------------|
| `GET /api/data/sessions` | Session list with filters |
| `GET /api/data/responses` | Flat response export |
| `GET /api/data/stats` | Aggregated funnel metrics |
