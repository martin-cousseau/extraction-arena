# Canonical rescue-sheet contract

UI, persistence, scoring, metrics, and the extraction prompt all use a versioned record: `rescue-sheet-ev-v1.1`. Pasted gold, OEM free-form bags, and vision-model output enter through one of three paths, then validate and project before evaluation.

```
paste / OEM / model JSON
        ├─ stampRichEnvelope     (rich ISO-style gold)
        ├─ Tesla adapter         (free-form; only registry adapter)
        └─ normalizeVlmToDraft   (live model JSON; not in the registry)
                ▼
        rescue-sheet-ev-v1.1 → validate → project() → score
```

| Concept | Role |
|---|---|
| `canonical` | Source of truth (nested domain + app envelope) |
| `rawSource` | Unmodified paste for audit/reprocessing |
| `golden` | Derived flat projection of `canonical` for scoring/UI |

Types: [`schema.ts`](./schema.ts) · JSON Schema: [`schema.json`](./schema.json) · Ingest: [`ingest.ts`](./ingest.ts)

## Three paths

The adapter **registry** holds one OEM adapter (`TeslaRescueSheetAdapter`). The other two paths are not registry adapters.

| Path | Code | Registry? | Typical input |
|---|---|---|---|
| Rich / identity stamp | `stampRichEnvelope` in [`ingest.ts`](./ingest.ts) | No (`identity_rich` / `identity`) | Nested ISO-style gold, or already-canonical v1.0/v1.1 |
| Tesla free-form | [`adapters/tesla.ts`](./adapters/tesla.ts) | Yes (`tesla`) | `{ golden_extraction: { key: { value, … } } }` or a flat free-form bag |
| VLM normalizer | [`vlm.ts`](./vlm.ts) `normalizeVlmToDraft` | No | Model JSON shaped like the empty v1.1 skeleton |

### Rich domain gold — `stampRichEnvelope`

Used when the body is already nested: `standard_reference`, non-empty `warnings`, nested responder sections, HV/LV systems, `vehicle_layout.structural_zones`, or a claimed `rescue-sheet-ev-v1.0` / `v1.1`.

Stamps the envelope (`schema_version`, `record_id`, `lifecycle_status`, `review`), normalizes `document.source_pages` and the energy enum (`"electricity"` → `battery_electric`), and leaves nested domain sections as-is.

### Free-form OEM — `TeslaRescueSheetAdapter`

`canHandle` is true for Tesla/Cybertruck markers or a top-level `golden_extraction`. Payloads that already declare a canonical `schema_version` go through stamp instead.

Known keys map through a table; unmapped keys land in `legacy_fields`. Add another OEM by implementing `RescueSheetAdapter` and appending it to `ADAPTERS` in [`adapters/registry.ts`](./adapters/registry.ts).

### Vision-model output — `normalizeVlmToDraft`

Models are prompted with the empty v1.1 skeleton. Output is coerced and wrapped (`source_type: 'vlm_extraction'`), not run through the Tesla key table. Called from extraction (`lib/api.ts`), not from dataset paste ingest.

## Dataset ingest

[`ingestToCanonical`](./ingest.ts): stamp if v1.0/v1.1 or rich-domain shape; otherwise the Tesla adapter (forced fallback if the registry misses an object). Then always `validate`, `goldenProjection`, and keep `rawSource`.

VLM path is outside ingest: chat JSON → `normalizeVlmToDraft` → validate/project/score.

| Step | Module |
|---|---|
| Validate | [`validate.ts`](./validate.ts) — JSON Schema + domain rules; `Issue[]`, never thrown |
| Lifecycle | [`lifecycle.ts`](./lifecycle.ts) — metadata + rules only |
| Project | [`project.ts`](./project.ts) — nested canonical → flat path map |
| Prompt | [`prompt.ts`](./prompt.ts) — empty skeleton only |
| Score | `frontend/src/lib/evaluation/` |

Sentinels (scored as absent): scalar `"not_found"`, array `[]`, object `{}`. Evidence is page-level; no bounding boxes.

## Adapter interface

```ts
interface RescueSheetAdapter {
  id: string;
  canHandle(input: unknown): boolean;
  normalize(input: unknown, context: SourceContext): NormalizeResult;
}
```

`canHandle` must not throw. Preserve unknowns under `legacy_fields`. Do not send VLM output through the registry.

## Related modules

| File | Purpose |
|---|---|
| [`schema.ts`](./schema.ts) / [`schema.json`](./schema.json) | Contract types + Draft 2020-12 boundary |
| [`ingest.ts`](./ingest.ts) | Dataset paste → canonical + golden + rawSource |
| [`adapters/registry.ts`](./adapters/registry.ts) | Adapter list |
| [`adapters/tesla.ts`](./adapters/tesla.ts) | Free-form Tesla / `golden_extraction` mapper |
| [`vlm.ts`](./vlm.ts) | Model JSON → draft |
| [`energy.ts`](./energy.ts) | Energy enum normalization |
| [`fixtures/cybertruck-rich-source.json`](./fixtures/cybertruck-rich-source.json) | Example rich-domain gold |

Repo conventions: [`AGENTS.md`](../../../../AGENTS.md).
