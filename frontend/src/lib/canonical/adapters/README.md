# OEM adapters

The adapter registry is for free-form OEM / supplier JSON that does not already match the nested canonical domain.

One adapter today: `TeslaRescueSheetAdapter` ([`tesla.ts`](./tesla.ts)).

Vision-model output uses [`../vlm.ts`](../vlm.ts) (`normalizeVlmToDraft`). Rich ISO-style gold uses [`../ingest.ts`](../ingest.ts) (`stampRichEnvelope`).

| File | Role |
|---|---|
| [`types.ts`](./types.ts) | `RescueSheetAdapter`, `SourceContext`, envelope helpers |
| [`registry.ts`](./registry.ts) | `ADAPTERS`, `pickAdapter`, `normalizeWithAdapter` |
| [`tesla.ts`](./tesla.ts) | Free-form / `golden_extraction` → `rescue-sheet-ev-v1.1` |

To add an OEM adapter: implement `RescueSheetAdapter`, append it to `ADAPTERS`, keep unrecognized keys in `legacy_fields`, and keep `canHandle` non-throwing.

Three-path overview: [parent README](../README.md).
