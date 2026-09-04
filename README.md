![Extraction Arena](docs/assets/banner.jpg)

# Extraction Arena

Compare vision models on first-responder rescue sheets. Upload a PDF, paste its golden JSON, then run GLM-5V-Turbo (Z.AI), GPT-5.4 mini (OpenAI), and Grok 4.5 (xAI) side by side. Each field is scored against a versioned `rescue-sheet-ev-v1.1` record. Datasets live in the browser (IndexedDB) and survive restarts.

The seed document is Tesla’s public 4-page Cybertruck rescue sheet. Fixture wording taken from that sheet remains Tesla’s.

## Quick start

`backend/` and `frontend/` are independent packages. From the repo root:

```bash
npm install
npm run install:all
cp frontend/.env.example frontend/.env   # add VITE_ZAI_API_KEY, VITE_OPENAI_API_KEY, VITE_XAI_API_KEY
npm run dev
```

- Frontend → http://localhost:5173
- Backend → http://localhost:3001 (`POST /api/extract`, `POST /api/llm`)

Or run them separately: `npm run dev --prefix backend` and `npm run dev --prefix frontend`.

Open http://localhost:5173 → **+ Create dataset** → name, PDF, golden JSON → **Run Extraction**.

## Docker

```bash
cp .env.example .env   # add the three VITE_* keys
docker compose up --build
```

Frontend is at http://localhost:5173 (nginx proxies `/api/*` to the backend). Backend is also on http://localhost:3001.

## Canonical contract

Pasted OEM JSON and model output are normalized into `rescue-sheet-ev-v1.1` before scoring. Scoring uses a derived flat projection of that record, not the raw paste. Ingest paths, adapters, and the empty extraction skeleton: [`frontend/src/lib/canonical/README.md`](frontend/src/lib/canonical/README.md).

## Environment

Frontend (`frontend/.env`):

| Var | Purpose |
|---|---|
| `VITE_ZAI_API_KEY` | GLM-5V-Turbo — `https://api.z.ai/api/paas/v4/chat/completions` |
| `VITE_OPENAI_API_KEY` | GPT-5.4 mini — `https://api.openai.com/v1/chat/completions` |
| `VITE_XAI_API_KEY` | Grok 4.5 — `https://api.x.ai/v1/chat/completions` |

Vite exposes `VITE_*` vars to the browser. Keys stay client-side and are forwarded through the same-origin `/api/llm` proxy (the providers do not send CORS headers).

Backend (`backend/.env`): optional `PORT` (default `3001`).

Repo conventions: [`AGENTS.md`](AGENTS.md).

## License

MIT. See [LICENSE](LICENSE).
