![Extraction Arena](docs/assets/banner.jpg)

# Extraction Arena

[![CI](https://github.com/martin-cousseau/extraction-arena/actions/workflows/ci.yml/badge.svg)](https://github.com/martin-cousseau/extraction-arena/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Hugging Face](https://img.shields.io/badge/Hugging%20Face-dataset-yellow.svg)](https://huggingface.co/datasets/martincousseau/Cybertruck-Rescue-Sheet)

<p>
  <a href="https://huggingface.co/datasets/martincousseau/Cybertruck-Rescue-Sheet"><img src="docs/assets/huggingface-logo.jpg" alt="Hugging Face" height="36" /></a>
  &nbsp;&nbsp;
  <a href="https://github.com/martin-cousseau/extraction-arena"><img src="docs/assets/github-logo.jpg" alt="GitHub" height="36" /></a>
  &nbsp;&nbsp;
  <a href="https://youtu.be/QXWN8WyvPmI"><img src="docs/assets/youtube-logo.jpg" alt="YouTube" height="36" /></a>
</p>

Eval harness for document extraction pipelines scored against a per-document golden dataset. Upload a PDF, paste its golden JSON, then run **LlamaParse** (LlamaExtract; persisted run id `docai`) or a vision pipeline (GLM-5V-Turbo, GPT-5.4 mini, Grok 4.5). Each field is scored against a versioned `rescue-sheet-ev-v1.1` record.

Datasets and runs are stored on the local backend (`backend/data/arena`) so Safari, Brave, and Chrome share the same records. Each browser also caches them in IndexedDB if the API is down. Scoring never leaves the client.

The seed document is Tesla’s public 4-page [Cybertruck rescue sheet](https://digitalassets.tesla.com/tesla-contents/image/upload/Cybertruck-Rescue-Sheet.pdf). The structured gold is on [Hugging Face](https://huggingface.co/datasets/martincousseau/Cybertruck-Rescue-Sheet). Walkthrough: [YouTube](https://youtu.be/QXWN8WyvPmI). Write-up: [martincousseau.com/research/extraction-arena](https://martincousseau.com/research/extraction-arena). Fixture wording taken from that sheet remains Tesla’s.

## What you can do

- Create a dataset from a PDF + golden JSON (`rescue-sheet-ev-v1.1` or a Tesla-style free-form bag)
- Launch LlamaParse at `cost_effective` / `agentic` / `agentic_plus` / `turbo` (`parse_tier` stays `agentic`)
- Score exact, partial, precision, recall, and F1 on the flat projection — not the raw paste
- Expand a field on the run page for an alignment-aware diff (sequence vs set)
- Optionally run a GPT-5.4 mini judge. Uplift can raise field scores; the qualitative insights brief never rewrites them
- Plot weekly extraction score and run volume on the dashboard
- Delete a dataset or run locally; in-flight work is aborted and LlamaParse extract jobs are removed from Llama Cloud

## Quick start

Requires **Node 20+**. `backend/` and `frontend/` are independent packages. From the repo root:

```bash
npm install
npm run install:all
cp frontend/.env.example frontend/.env   # optional: vision VITE_* keys + judge
cp backend/.env.example backend/.env     # add LLAMA_CLOUD_API_KEY for LlamaParse
npm run dev
```

- Frontend → http://localhost:5173
- Backend → http://localhost:3001 (`POST /api/extract`, `POST /api/llm`, `POST /api/pipelines/docai`, `POST /api/pipelines/docai/jobs/delete`)

Or run them separately: `npm run dev --prefix backend` and `npm run dev --prefix frontend`.

Open http://localhost:5173 → **Datasets → Create dataset** → name, PDF, golden JSON → **Run Extraction Arena**. Results land on **Dashboard** and **Runs**. Open a run to inspect field diffs, then **Analyze with judge** if you have an OpenAI key in Settings.

```bash
npm test          # frontend Vitest
npm run typecheck # frontend + backend
```

## Docker

Hot-reload (Vite HMR + `tsx watch`). Source is bind-mounted, so edits apply without rebuilding:

```bash
cp .env.example .env   # add LLAMA_CLOUD_API_KEY (and optional VITE_* vision keys)
docker compose -f docker-compose.dev.yml up --build
# or: npm run docker:dev
```

- Frontend → http://localhost:5173
- Backend → http://localhost:3001

Reload:

| Change | What to do |
|---|---|
| Frontend / backend source | Save the file. Vite HMR and `tsx watch` pick it up. |
| One service stuck | `docker compose -f docker-compose.dev.yml restart backend` (or `frontend`) |
| `package.json` / lockfile | Restart the service (`npm ci` runs on lockfile change), or `npm run docker:dev:watch` |
| Stop | Ctrl+C, or `npm run docker:dev:down` |

Production-like (compiled backend + nginx, no live reload):

```bash
docker compose up --build
```

Frontend is at http://localhost:5173 (nginx proxies `/api/*` to the backend). Backend is also on http://localhost:3001. Don't run both compose files at once — they share those ports.

## Repository layout

Two independent Node projects (not a workspace). The root `package.json` only has convenience scripts.

```
backend/                 Express: PDF→PNG (300 DPI), /api/llm, LlamaExtract
frontend/src/pipelines/  One folder per extractor (schema, adapter, logo, launch UI)
frontend/src/lib/evaluation/  Deterministic scorer + optional judge overlay
frontend/src/lib/canonical/   rescue-sheet-ev-v1.1 ingest, validate, project
hf-dataset/              Published Cybertruck gold (Hugging Face mirror)
```

Agent / contributor conventions: [`AGENTS.md`](AGENTS.md). Canonical contract: [`frontend/src/lib/canonical/README.md`](frontend/src/lib/canonical/README.md).

## Pipelines

| Id | UI label | Kind | Status |
|---|---|---|---|
| `docai` | LlamaParse | Native LlamaExtract | Default |
| `glm` / `gpt` / `grok` | GLM / GPT / Grok | Vision via `/api/llm` | Launchable |

LlamaParse posts its own domain-only JSON Schema (`llamaExtractDataSchema` in `frontend/src/pipelines/llamaparse/`). Vision adapters still receive the empty v1.1 skeleton — never golden answers. Cost for Llama uses official credits × `$1.25 / 1,000`. A null `usage.credits` is not treated as $0; the backend polls until billing lands.

### Add a pipeline

1. Create `frontend/src/pipelines/<name>/` with a `PipelineDefinition` (`id`, `label`, `Logo`, `extract`, optional `dataSchema`).
2. Append it to `MODULES` in [`frontend/src/pipelines/registry.ts`](frontend/src/pipelines/registry.ts).
3. Native extractors call a backend route. Do not call providers from the browser. Do not put scoring in the backend.
4. The harness always runs `normalizeVlmToDraft` → `validate` → `project` → `evaluateDataset`. Surface issues; never throw them away.

## Scoring

Pasted OEM JSON and model output are normalized into `rescue-sheet-ev-v1.1` before scoring. The scorer compares the **flat projection** of that record, and only paths present on this dataset.

| Signal | Meaning |
|---|---|
| Exact | Field-level gate (sequence for `ordered_steps`, set for warnings / inventories) |
| Partial | 0–1 credit from the same alignments |
| P / R / F1 | Shared alignments; extras are false positives, misses are false negatives |
| Extraction score | Composed 0–100 gauge (gate + partial + F1) |

Sentinels (scored as absent; two absents match): scalar `"not_found"`, array `[]`, object `{}`. Exact prefers sheet-supported `source_text` over internal action/class IDs when both exist.

**Analyze with judge** (optional, OpenAI `gpt-5.4-mini`) can raise field scores when the model is semantically equivalent. The insights brief is overlay only.

## Environment

Backend (`backend/.env`):

| Var | Purpose |
|---|---|
| `LLAMA_CLOUD_API_KEY` | Native LlamaParse pipeline (LlamaExtract). Never prefix with `VITE_`. |
| `LLAMA_CLOUD_PROJECT_ID` | Optional Llama Cloud project |
| `PORT` | Optional, default `3001` |

Frontend (`frontend/.env`):

| Var | Purpose |
|---|---|
| `VITE_OPENAI_API_KEY` | Semantic judge + insights on a completed run, and the GPT vision pipeline. |
| `VITE_ZAI_API_KEY` | GLM-5V-Turbo vision pipeline |
| `VITE_XAI_API_KEY` | Grok 4.5 vision pipeline |

Vite exposes `VITE_*` vars to the browser. Vision keys are forwarded through `/api/llm`. LlamaParse does not use them. An optional session override for Llama is sent as `x-llama-api-key` and is never stored.

The UI is BoardUI (React 19, Tailwind v4, React Aria) on Vite — not shadcn. Dark is the product default; the theme toggle ignores OS preference.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, tests, UI rules, and pull-request conventions. By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md). Please report vulnerabilities privately — [SECURITY.md](SECURITY.md).

## License

MIT. See [LICENSE](LICENSE).
