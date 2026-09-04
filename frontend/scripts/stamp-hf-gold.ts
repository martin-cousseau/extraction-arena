/**
 * Stamp Downloads gold through the app ingest pipeline and write the Hub package.
 * Run from frontend/: npx vite-node scripts/stamp-hf-gold.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stampRichEnvelope } from '../src/lib/canonical/ingest';
import { validate } from '../src/lib/canonical/validate';
import { project } from '../src/lib/canonical/project';
import type { RescueSheetV1 } from '../src/lib/canonical/schema';
import { isPlainObject } from '../src/lib/canonical/adapters/types';

const SOURCE_PDF =
  'https://digitalassets.tesla.com/tesla-contents/image/upload/Cybertruck-Rescue-Sheet.pdf';
const RECORD_ID = 'tesla-cybertruck-rescue-sheet-2023ca-001-v02';
const REVIEWED_AT = '2026-08-23T16:29:00.000Z';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const downloadsPath = '/Users/martin/Downloads/dataset.json';
const outDir = path.join(repoRoot, 'hf-dataset');

function orderedRecord(record: RescueSheetV1): RescueSheetV1 {
  const {
    schema_version,
    record_id,
    lifecycle_status,
    review,
    standard_reference,
    document,
    vehicle,
    responder_information,
    vehicle_layout,
    warnings,
    evidence,
    provenance,
    ...rest
  } = record;
  return {
    schema_version,
    record_id,
    lifecycle_status,
    review,
    ...(standard_reference !== undefined ? { standard_reference } : {}),
    document,
    vehicle,
    responder_information,
    ...(vehicle_layout !== undefined ? { vehicle_layout } : {}),
    ...(warnings !== undefined ? { warnings } : {}),
    evidence,
    provenance,
    ...rest,
  };
}

function cleanSourcePages(raw: Record<string, unknown>): void {
  const doc = isPlainObject(raw.document) ? raw.document : null;
  if (!doc || !Array.isArray(doc.source_pages)) return;
  doc.source_pages = doc.source_pages.map((p, i) => {
    const page = isPlainObject(p) ? p : {};
    const sheetNum =
      typeof page.sheet_page_number === 'number'
        ? page.sheet_page_number
        : typeof page.page_number === 'number'
          ? page.page_number
          : i + 1;
    const printed =
      typeof page.printed_page_number === 'string'
        ? page.printed_page_number
        : String(sheetNum).padStart(2, '0') + '/04';
    return {
      page_id: `page-${sheetNum}`,
      page_number: sheetNum,
      sheet_page_number: sheetNum,
      printed_page_number: printed,
      filename: 'Cybertruck-Rescue-Sheet.pdf',
      ...(typeof page.content_summary === 'string'
        ? { content_summary: page.content_summary }
        : {}),
    };
  });
}

function cleanProvenance(raw: Record<string, unknown>): void {
  const p = isPlainObject(raw.provenance) ? { ...raw.provenance } : {};
  delete p.page_to_attachment_mapping;
  const src = isPlainObject(p.source_document) ? { ...p.source_document } : {};
  p.source_document = {
    ...src,
    manufacturer: src.manufacturer ?? 'Tesla',
    vehicle: src.vehicle ?? 'Cybertruck',
    document_id: src.document_id ?? 'TESLA-2023CA-001',
    document_version: src.document_version ?? '02',
    url: SOURCE_PDF,
  };
  p.source_type = 'oem_json';
  p.source_format = 'rescue-sheet-ev-v1.1';
  p.received_at = REVIEWED_AT;
  raw.provenance = p;
}

const raw = JSON.parse(fs.readFileSync(downloadsPath, 'utf8')) as Record<string, unknown>;
if (!isPlainObject(raw)) throw new Error('Downloads gold is not an object');

cleanSourcePages(raw);
cleanProvenance(raw);
raw.review = {
  review_required: false,
  review_status: 'approved',
  reviewed_by: 'Martin Cousseau',
  reviewed_at: REVIEWED_AT,
};
raw.lifecycle_status = 'published';
raw.record_id = RECORD_ID;
raw.evidence = [];

const stamped = stampRichEnvelope(raw, {
  recordId: RECORD_ID,
  receivedAt: REVIEWED_AT,
  sourcePages: [],
  sourceFormat: 'rescue-sheet-ev-v1.1',
}, { adapterId: 'identity_rich', lifecycleStatus: 'published' });

stamped.document.source_pages = stamped.document.source_pages.map((page) => {
  const cleaned = { ...page };
  if (cleaned.attachment_id == null) delete cleaned.attachment_id;
  if (cleaned.attachment_filename == null) delete cleaned.attachment_filename;
  return cleaned;
});

const rawProvenance = isPlainObject(raw.provenance) ? raw.provenance : {};
if (rawProvenance.exact_scoring_policy_v1 != null) {
  stamped.provenance = {
    ...stamped.provenance,
    exact_scoring_policy_v1: rawProvenance.exact_scoring_policy_v1,
  } as RescueSheetV1['provenance'];
}

const canonical = orderedRecord(stamped);
const result = validate(canonical, { publishIntent: true });
const proj = project(canonical);

const report = {
  schema_version: canonical.schema_version,
  record_id: canonical.record_id,
  lifecycle_status: canonical.lifecycle_status,
  valid: result.valid,
  canPublish: result.canPublish,
  issue_count: result.issues.length,
  errors: result.issues.filter((i) => i.level === 'error'),
  warnings: result.issues.filter((i) => i.level === 'warning').slice(0, 20),
  warning_count_total: result.issues.filter((i) => i.level === 'warning').length,
  projected_paths: Object.keys(proj).length,
  warnings_inventory: Array.isArray(canonical.warnings) ? canonical.warnings.length : 0,
  hv: proj['vehicle.propulsion.high_voltage_battery']?.value ?? null,
  lv: proj['vehicle.propulsion.low_voltage_battery']?.value ?? null,
  energy: canonical.vehicle.propulsion.primary_energy_source,
  source_pages: canonical.document.source_pages,
};

if (!result.valid || !result.canPublish || report.errors.length) {
  console.error(JSON.stringify(report, null, 2));
  throw new Error('Publish gate failed');
}

const dataDir = path.join(outDir, 'data');
const schemaDir = path.join(outDir, 'schema');
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(schemaDir, { recursive: true });

const pretty = JSON.stringify(canonical, null, 2) + '\n';
fs.writeFileSync(path.join(dataDir, 'rescue-sheet.json'), pretty);
fs.writeFileSync(path.join(dataDir, 'rescue-sheet.jsonl'), JSON.stringify(canonical) + '\n');

const projectionRows = Object.entries(proj).map(([field_path, field]) => ({
  path: field_path,
  value: field.value,
}));
fs.writeFileSync(
  path.join(dataDir, 'projection.jsonl'),
  projectionRows.map((row) => JSON.stringify(row)).join('\n') + '\n'
);

fs.copyFileSync(
  path.join(repoRoot, 'frontend/src/lib/canonical/schema.json'),
  path.join(schemaDir, 'rescue-sheet-ev-v1.1.json')
);

fs.copyFileSync(
  path.join(dataDir, 'rescue-sheet.json'),
  path.join(repoRoot, 'frontend/src/lib/canonical/fixtures/cybertruck-rich-source.json')
);

console.log(JSON.stringify({ ...report, warning_sample: report.warnings }, null, 2));
console.log(`wrote ${projectionRows.length} projection rows → ${outDir}`);
