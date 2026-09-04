# Gold / Exact decisions v1 (2026-08-12)

User-validated policy after PDF eye-check discussion.

## Exact targets

| Decision | Outcome |
|---|---|
| A1/A2 | Score labels only: `800V Li-Ion`, `48V Li-Ion`. Projection paths renamed to `vehicle.propulsion.high_voltage_battery` / `low_voltage_battery` (rich gold still uses `*_systems` arrays). |
| A3 | `primary_energy_source` **not Exact-projected** (inferred only). |
| A4/A5 + no-contact | Score **with color word**: `green Appropriate lift areas`, `yellow Safe stabilization points for Cybertruck resting on its side`, `brown High Voltage (HV) Battery`. |
| A6 | Pyrotechnics **dropped** from Exact projection. |
| A7 | Towing section: body + pre-transport callout. Storage red-box scored under **warnings** (no double project of `post_incident_storage`). |
| A8 | Full **11** red warning boxes in document order (see gold `warnings[]`). |
| A9 | `vehicle_layout.components` **dropped** from Exact projection. |
| B / D | Deferred. |

## Prompt principle (user)

Do **not** ask models to name box colors as answers. Ask them to **extract section content** (including embedded warning/callout text) by layout. Per-section warning GT mapping can be refined later.

## Normalization

Hard line wraps inside a box → spaces. Hyphenated line breaks like `com-ponents` → `components` when that is the clear print wrap.

## Re-import

Re-create / re-paste dataset from updated `dataset.json` so IndexedDB golden projection refreshes.
