# Contributing

Thanks for helping with Extraction Arena. This document is the practical counterpart to [`AGENTS.md`](AGENTS.md) (layout, scoring contract, hard constraints).

## Ground rules

- Do not call extraction providers from the browser. LlamaExtract stays on the backend; vision keys are forwarded through `POST /api/llm`.
- Do not put scoring in the backend. One evaluation engine: `frontend/src/lib/evaluation/`.
- Never mock scores in tests. Pipeline JSON always goes `normalizeVlmToDraft` → `validate` → `project` → `evaluateDataset`. Validation returns `Issue[]`; it does not throw.
- Keep secrets out of git. Copy `.env.example` files; never commit `.env`.
- Fixture wording taken from Tesla’s public Cybertruck rescue sheet remains Tesla’s. Do not add other OEM sheets unless you have the right to publish them.

## Setup

Node 20+. From the repo root:

```bash
npm install
npm run install:all
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env   # LLAMA_CLOUD_API_KEY to run LlamaParse
npm run dev
```

Hot-reload Docker is documented in the [README](README.md#docker).

## Checks

CI runs the same commands on every pull request:

```bash
npm test          # frontend Vitest
npm run typecheck # frontend + backend
```

Add or extend tests next to the code you change (`*.test.ts`). Array geometry is path-aware: `ordered_steps` is a sequence; `warnings` and inventories are sets.

## UI

The app uses BoardUI (React 19, Tailwind v4, React Aria) on Vite — not shadcn, not Next.js.

- Prefer `frontend/src/components/base/` and `frontend/src/components/application/` over lookalikes. Missing a primitive? `npx boardui@latest add <name>`.
- Semantic tokens only (`text-text-secondary`, not `text-gray-500`). Merge classes with `cx()` from `@/utils/cx`.
- Composite type utilities only (`text-body-medium`). Minimum type size is BoardUI `text-body-*` (14px).
- Dark is the product default (`.dark` on `<html>`). Do not write `dark:` overrides with raw colors.

## Pipelines

Each extractor is a folder under `frontend/src/pipelines/` registered in `registry.ts`. LlamaParse keeps persisted run id `docai`. See the [README pipeline section](README.md#pipelines) for the add-a-pipeline checklist.

## Pull requests

1. Branch from `main` (or the open feature branch if you are extending work already in review).
2. Keep commits [Conventional Commits](https://www.conventionalcommits.org/): `feat(eval): …`, `fix(ui): …`, `docs: …`.
3. One concern per commit when you can. Do not mix BoardUI token churn with scorer changes.
4. Fill in the pull-request template: what changed, how to verify, and whether you ran `npm test` / `npm run typecheck`.
5. Do not add API keys, PDFs with personal data, or generated `dist/` output.

Issues and pull requests are covered by the [Code of Conduct](CODE_OF_CONDUCT.md).
