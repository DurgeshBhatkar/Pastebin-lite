# Pastebin‑Lite (Take‑Home)

Small “Pastebin”‑like app with:
- create paste
- shareable URL to view paste
- optional TTL expiry and/or max view limit

This codebase is set up to deploy on **Vercel** (serverless functions) and uses **Upstash Redis** for persistence.

## Run locally

1) Copy `.env.example` → `.env` and set your Upstash credentials:

```bash
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

2) Install and run:

```bash
npm install
npm start
```

For local development with auto-restart:

```bash
npm run dev
```

Then open (replace with your port if you set `PORT`):
- UI: `http://localhost:3001/`
- Health: `GET /api/healthz`

## Deploy on Vercel

Your repo is already on GitHub. Deploy it on Vercel as follows:

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New…** → **Project**.
3. **Import** your GitHub repo (select your Pastebin-Lite repo).
4. Before deploying, set **Environment Variables** (or use the “Environment Variables” section on the import screen):
   - `UPSTASH_REDIS_REST_URL` = your Upstash Redis REST URL  
   - `UPSTASH_REDIS_REST_TOKEN` = your Upstash Redis REST token  
   - `TEST_MODE` = `1` (so the grader can use `x-test-now-ms` for TTL tests)
5. Click **Deploy**. Vercel will build and deploy; you’ll get a URL like `https://your-project.vercel.app`.

After deploy:

- **UI:** `https://your-project.vercel.app/`
- **Health:** `https://your-project.vercel.app/api/healthz`
- **Create paste:** `POST https://your-project.vercel.app/api/pastes`
- **View paste:** `https://your-project.vercel.app/p/<id>`

The `/p/:id` path is handled by a rewrite in `vercel.json` to `/api/p/:id`.

## API

### Health check

`GET /api/healthz` → `200` JSON:

```json
{ "ok": true }
```

`ok` reflects whether the app can access its persistence layer.

### Create a paste

`POST /api/pastes` body:

```json
{
  "content": "string",
  "ttl_seconds": 60,
  "max_views": 5
}
```

Response:

```json
{
  "id": "string",
  "url": "https://<host>/p/<id>"
}
```

### Fetch a paste (API)

`GET /api/pastes/:id` → `200` JSON:

```json
{
  "content": "string",
  "remaining_views": 4,
  "expires_at": "2026-01-01T00:00:00.000Z"
}
```

Unavailable pastes return `404` JSON.

### View a paste (HTML)

`GET /p/:id` → `200` HTML containing the paste content, safely escaped.  
Unavailable pastes return `404`.

## Deterministic time (grader support)

If `TEST_MODE=1` is set, the request header `x-test-now-ms: <ms since epoch>` is treated as “now” for TTL expiry logic (including TTL calculation at creation and expiry checks).

## Persistence layer

This project uses **Upstash Redis** (REST API) for persistence across requests and across serverless instances on Vercel.

## Design decisions

- **Serverless API** under `api/` for Vercel; Express in `server.js` for local run.
- **Redis Lua script** in the store for atomic view-count updates to avoid over-serving under concurrent requests.
- **TEST_MODE + x-test-now-ms** applied at both paste creation and fetch so TTL grading is deterministic.
