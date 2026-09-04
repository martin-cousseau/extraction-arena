# AGENTS.md

Extraction Arena is an eval harness for document extraction pipelines scored against a per-document golden dataset. Seed document: Tesla Cybertruck first-responder rescue sheet. Scoring, UI, persistence, and schemas use the canonical `rescue-sheet-ev-v1.1` record (rich ISO-17840-style domain + app envelope; v1.0 still migrates). Arbitrary JSON enters only through envelope-stamping, the Tesla adapter, or VLM/extract normalize.

The native pipeline is **DocAI** (LlamaExtract). GLM-5V-Turbo, GPT-5.4 mini, and Grok 4.5 remain as **deprecated** vision adapters.

## Layout

Two independent Node projects (not a workspace). The root `package.json` only has convenience scripts (`npm run dev` starts both).

- `backend/` — Express + TypeScript. `POST /api/extract` (PDF→PNG at 300 DPI), `POST /api/llm` (vision proxy), `POST /api/pipelines/docai` (LlamaExtract).
- `frontend/` — Vite + React 19 + TypeScript + Tailwind v4 + BoardUI. Datasets and runs in IndexedDB; scoring in `lib/evaluation/`.

## Backend

Do not call providers from the browser. Do not put scoring in the backend.

- **DocAI:** `LLAMA_CLOUD_API_KEY` lives on the backend. Optional session override is sent as `x-llama-api-key` and is never stored.
- **Deprecated vision:** `VITE_*` keys stay client-side and are forwarded through `/api/llm` because those providers omit CORS.

## Canonical contract

```
paste / OEM / model JSON
        ├─ stampRichEnvelope     (rich ISO-style gold)
        ├─ Tesla adapter         (free-form { golden_extraction }; only registry adapter)
        └─ normalizeVlmToDraft   (live model JSON; not in the registry)
                ▼
        rescue-sheet-ev-v1.1 → validate → project() → score
```

Per dataset (`lib/canonical/ingest.ts`):

- `canonical` — source of truth
- `rawSource` — unmodified paste (audit only)
- `golden` — derived flat projection for scoring/UI (read-only)

Validation (`canonical/validate.ts`) never throws; problems are `Issue[]`. Evidence is page-level (`location_descriptor`), not bounding boxes. Lifecycle is metadata + rules (`canonical/lifecycle.ts`); there is no review-queue UI.

A dataset is created via **Create Dataset** (name → PDF → golden JSON) and stored in IndexedDB (`lib/db.ts`, DB v3: original `pdfBlob` + `runs`). The extraction prompt (`buildCanonicalPrompt`) still sends the empty v1.1 skeleton for vision adapters — never golden answers. DocAI receives a domain-only JSON Schema (`llamaExtractDataSchema`). Scoring still only compares paths present on this dataset’s projection. Pre-v1 datasets migrate lazily on load.

Details: [`frontend/src/lib/canonical/README.md`](frontend/src/lib/canonical/README.md).

## Hard constraints

- **`pdfjs-dist` is pinned to `3.11.174`.** v4’s worker bootstrap needs `process.getBuiltinModule()` (Node 20.16+/22+). Backend uses `@napi-rs/canvas` plus `Path2D`/`ImageData`/`DOMMatrix` polyfills.
- **`NodeCanvasFactory.destroy` must stay a no-op.** Setting `canvas.width = 0` throws `Failed to unwrap exclusive reference of CanvasElement` while the 2D context holds a shared borrow. Hits image-heavy PDFs; simple test PDFs miss it.
- Route pdf.js through the factory passed to `getDocument({ canvasFactory })`. The optional `canvas` (node-canvas) dependency that pdf.js pulls in is unused for rendering.
- PDF→PNG at exactly **300 DPI**.
- One evaluation engine (`lib/evaluation/`) on the flat projection. Exact, partial, and P/R/F1 share alignments. Array geometry is path-aware (`ordered_steps` → sequence; `warnings`/inventories → set). Never mock scores.
- Exact prefers sheet-supported `source_text` over internal action/class IDs when both exist.
- Pipeline JSON is always `normalizeVlmToDraft` → `validate` → `project` → `evaluateDataset`. Issues are surfaced, never thrown.
- DocAI is the default pipeline. Vision adapters are deprecated, not deleted.
- Llama cost uses official credits × `$1.25 / 1,000`. Never treat a null `usage.credits` as $0; poll until billing lands.

## Sentinels

Absent scalar → `"not_found"`. Absent array → `[]`. Absent object → `{}`. Scoring treats all three as absent; two absents match.

## Pipelines

| Id | Kind | Status |
|---|---|---|
| `docai` | Native LlamaExtract (`tier: agentic`, `parse_tier: agentic`) | Default |
| `glm` / `gpt` / `grok` | Vision via `/api/llm` | Deprecated |

Vision calls: `temperature: 0`, `response_format: { type: "json_object" }`, prompt + one `image_url` per page.

## UI

BoardUI on Vite (not shadcn, not Next.js). React Aria primitives, Remix Icon, `cx()` from `@/utils/cx`, semantic tokens only. Dark is the product default (`boardui:theme`); ThemeToggle is manual and ignores OS preference.

Pages: `/` dashboard, `/datasets`, `/datasets/new`, `/datasets/:id`, `/datasets/:id/ground-truth`, `/datasets/:id/config`, `/runs`, `/runs/:id`, `/settings`.

Prefer installed BoardUI components over lookalikes. Minimum type size is BoardUI `text-body-*` (14px). No particle systems, 3D, video, sound, or cursor trails.

<!-- boardui:rules:start -->
# BoardUI design rules

This project uses BoardUI (React + Tailwind CSS v4, source-owned components under `frontend/src/components/`). These rules always apply when writing UI code.

- Before hand-building any UI element, check `components/base/` and `components/application/`, and prefer it.
- Missing a component? `npx boardui@latest add <name>` instead of writing a lookalike.
- Import through the `@/` alias, e.g. `import { Button } from "@/components/base/buttons/button"`.
- Semantic tokens only. Never `text-gray-500`, `bg-white`, or leftover arena hex accents.
- Composite type utilities only (`text-body-medium`, `text-title-2-semibold`). Do not stack `text-sm font-medium`.
- Merge classes with `cx()` from `@/utils/cx`. Icons from `@remixicon/react` as component refs.
- Dark mode is the `.dark` class on `<html>`. Do not write `dark:` overrides with raw colors.
<!-- boardui:rules:end -->
