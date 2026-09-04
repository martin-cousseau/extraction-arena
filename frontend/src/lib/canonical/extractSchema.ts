import fullSchema from './schema.json';

/** Envelope / app metadata LlamaExtract should not try to invent. */
const ENVELOPE_KEYS = new Set([
  'schema_version',
  'record_id',
  'lifecycle_status',
  'review',
  'evidence',
  'provenance',
  'legacy_fields',
]);

interface JsonSchemaObject {
  type?: string;
  properties?: Record<string, unknown>;
  required?: string[];
  additionalProperties?: unknown;
  description?: string;
}

/**
 * Domain-only JSON Schema sent to LlamaExtract as `data_schema`.
 * Envelope fields are stamped after extract via normalizeVlmToDraft.
 */
export function llamaExtractDataSchema(): JsonSchemaObject {
  const properties = (fullSchema as JsonSchemaObject).properties ?? {};
  const domain: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (!ENVELOPE_KEYS.has(key)) domain[key] = value;
  }
  return {
    type: 'object',
    additionalProperties: true,
    description:
      'ISO-17840-style rescue-sheet domain body. Extract only what the document supports. Use empty arrays/objects or omit fields that are not on the sheet.',
    properties: domain,
    required: ['vehicle', 'responder_information'],
  };
}

export function isEnvelopeKey(key: string): boolean {
  return ENVELOPE_KEYS.has(key);
}
