# AGENTS.md

Extraction Arena compares GLM-5V-Turbo (Z.AI), GPT-5.4 mini (OpenAI), and Grok 4.5 (xAI) against a per-document golden dataset. Seed document: Tesla Cybertruck first-responder rescue sheet. Scoring, UI, persistence, and the extraction prompt all use the canonical `rescue-sheet-ev-v1.1` record (rich ISO-17840-style domain + app envelope; v1.0 still migrates). Arbitrary JSON enters only through envelope-stamping, the Tesla adapter, or VLM normalize.

## Layout

Two independent Node projects (not a workspace). The root `package.json` only has convenience scripts (`npm run dev` starts both).

- `backend/` — Express + TypeScript. `POST /api/extract` (PDF→PNG at 300 DPI) and `POST /api/llm` (pass-through vision proxy).
- `frontend/` — Vite + React 18 + TypeScript. Datasets in IndexedDB; scoring in `lib/evaluation/`.

## Backend

The LLM route exists because Z.AI, OpenAI, and xAI omit `Access-Control-Allow-Origin`. The frontend builds the OpenAI-compatible request and POSTs `{ endpoint, apiKey, payload }`; the backend forwards it and returns the upstream body. Do not call providers from the browser. Do not put scoring in the backend.

Keys stay client-side (`VITE_*`, editable in Settings) and are forwarded through the proxy. The backend never stores them.

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

A dataset is created via **Create Dataset** (name → PDF → golden JSON) and stored in IndexedDB (`lib/db.ts`, DB v2). The extraction prompt (`buildCanonicalPrompt`) sends the full empty v1.1 skeleton — never golden answers. Scoring still only compares paths present on this dataset’s projection. Pre-v1 datasets migrate lazily on load.

Details: [`frontend/src/lib/canonical/README.md`](frontend/src/lib/canonical/README.md).

## Hard constraints

- **`pdfjs-dist` is pinned to `3.11.174`.** v4’s worker bootstrap needs `process.getBuiltinModule()` (Node 20.16+/22+). Backend uses `@napi-rs/canvas` plus `Path2D`/`ImageData`/`DOMMatrix` polyfills.
- **`NodeCanvasFactory.destroy` must stay a no-op.** Setting `canvas.width = 0` throws `Failed to unwrap exclusive reference of CanvasElement` while the 2D context holds a shared borrow. Hits image-heavy PDFs; simple test PDFs miss it.
- Route pdf.js through the factory passed to `getDocument({ canvasFactory })`. The optional `canvas` (node-canvas) dependency that pdf.js pulls in is unused for rendering.
- PDF→PNG at exactly **300 DPI**.
- One evaluation engine (`lib/evaluation/`) on the flat projection. Exact, partial, and P/R/F1 share alignments. Array geometry is path-aware (`ordered_steps` → sequence; `warnings`/inventories → set). Never mock scores.
- Exact prefers sheet-supported `source_text` over internal action/class IDs when both exist.
- All three models are live calls with real keys.
- Normalize + validate every model JSON (`normalizeVlmToDraft` → `validate` → `project`). Issues are surfaced, never thrown.

## Sentinels

Absent scalar → `"not_found"`. Absent array → `[]`. Absent object → `{}`. Scoring treats all three as absent; two absents match.

## Vision calls

`temperature: 0`, `response_format: { type: "json_object" }`, multimodal content: extraction prompt + one `image_url` per page. Always via `/api/llm`.

| Model | Endpoint | Model ID |
|---|---|---|
| GLM-5V-Turbo | `https://api.z.ai/api/paas/v4/chat/completions` | `glm-5v-turbo` |
| GPT-5.4 mini | `https://api.openai.com/v1/chat/completions` | `gpt-5.4-mini` |
| Grok 4.5 | `https://api.x.ai/v1/chat/completions` | `grok-4.5` |

Bearer auth. No separate SDKs.

`VITE_` keys are exposed to the browser on purpose for this demo. If calls ever move server-side, drop the prefix.

## UI

Dark is the default. Settings includes a light/dark toggle. Backgrounds `#0A0A0F` / `#12121A` in dark.

Column accents, left to right: Ground Truth `#10B981` · GLM-5V-Turbo `#06B6D4` · GPT-5.4 mini `#8B5CF6` · Grok 4.5 `#F43F5E`.

Minimum font size 14px. Animations finish in ~3–5s; no particle systems, 3D, video, sound, or cursor trails.
