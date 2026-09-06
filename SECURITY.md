# Security policy

## Supported versions

This project is a research eval harness. Security fixes land on `main` only.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security problems.

1. Use [GitHub private vulnerability reporting](https://github.com/martin-cousseau/extraction-arena/security/advisories/new), or
2. Contact [@martin-cousseau](https://github.com/martin-cousseau).

Include the affected path, a short reproduction, and impact (for example: secret leakage, SSRF via the LLM proxy, or PDF parsing crash). You should hear back within a week. If we confirm the issue, we will credit you in the advisory unless you ask otherwise.

## What this app stores

- API keys entered in Settings stay in the browser session. They are not written to IndexedDB or the backend store.
- An optional Llama Cloud override is sent as `x-llama-api-key` and is never stored on the server.
- Datasets (including the original PDF) and run records are cached in IndexedDB and synced to `backend/data/arena` so every browser on this machine shares them. Do not copy that directory off-box.

Do not commit `.env` files, `VITE_*` keys, or `LLAMA_CLOUD_API_KEY`.
