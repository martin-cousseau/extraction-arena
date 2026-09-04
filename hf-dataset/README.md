---
license: mit
language:
  - en
pretty_name: Tesla Cybertruck Rescue Sheet (Gold)
size_categories:
  - n<1K
task_categories:
  - image-text-to-text
  - document-question-answering
annotations_creators:
  - expert-generated
source_datasets:
  - original
tags:
  - document-extraction
  - rescue-sheet
  - iso-17840
  - tesla
  - cybertruck
  - ev
  - first-responders
  - vlm
  - golden-dataset
  - text
configs:
  - config_name: default
    data_files:
      - split: train
        path: data/projection.jsonl
  - config_name: canonical
    data_files:
      - split: train
        path: data/rescue-sheet.jsonl
---

<p align="center">
  <img src="assets/banner.jpg" alt="Extraction Arena" width="100%" />
</p>

# Tesla Cybertruck Rescue Sheet (Gold)

One-document gold extraction of Tesla’s public 4-page Cybertruck first-responder rescue sheet. Used by [Extraction Arena](https://github.com/martin-cousseau/extraction-arena) to score vision-language models against a versioned `rescue-sheet-ev-v1.1` record.

This is an ISO 17840-**style** mapping (`mapping_candidate_not_certified`). It is **not** a certified rescue sheet and is **not** for operational emergency use.

<p align="center">
  <a href="https://huggingface.co/datasets/martincousseau/Cybertruck-Rescue-Sheet"><img src="assets/huggingface-logo.jpg" alt="Hugging Face" height="36" /></a>
  &nbsp;&nbsp;
  <a href="https://github.com/martin-cousseau/extraction-arena"><img src="assets/github-logo.jpg" alt="GitHub" height="36" /></a>
  &nbsp;&nbsp;
  <a href="https://youtu.be/QXWN8WyvPmI"><img src="assets/youtube-logo.jpg" alt="YouTube" height="36" /></a>
</p>

<p align="center">
  <a href="https://huggingface.co/datasets/martincousseau/Cybertruck-Rescue-Sheet">Hugging Face</a>
  ·
  <a href="https://github.com/martin-cousseau/extraction-arena">GitHub</a>
  ·
  <a href="https://youtu.be/QXWN8WyvPmI">YouTube walkthrough</a>
</p>

## Source document

Tesla publishes the original 4-page sheet for first responders:

- **Rescue sheet (PDF):** [Cybertruck-Rescue-Sheet.pdf](https://digitalassets.tesla.com/tesla-contents/image/upload/Cybertruck-Rescue-Sheet.pdf)
- **First responders hub:** [tesla.com/firstresponders](https://www.tesla.com/firstresponders)

| | |
|---|---|
| Manufacturer | Tesla |
| Model | Cybertruck (2023–) |
| Document ID | `TESLA-2023CA-001` |
| Version | `02` |
| Pages | 4 |

Sheet wording quoted in this gold remains Tesla’s. This dataset is the structured annotation, not a redistributed copy of the PDF.

## What's in the files

| File | What it is |
|---|---|
| `data/rescue-sheet.json` | Canonical nested record (`rescue-sheet-ev-v1.1`) |
| `data/rescue-sheet.jsonl` | Same record, one line (Hub `canonical` config) |
| `data/projection.jsonl` | Flat scoring paths used by Extraction Arena (default config, 34 fields) |
| `schema/rescue-sheet-ev-v1.1.json` | JSON Schema for the nested record |

Exact scoring prefers document-supported `source_text` over internal action/class IDs. Diagram-only items (pyrotechnics, component locations) stay in the nested gold and are not Exact-projected.

## Load

```python
from datasets import load_dataset

# Flat projection (path → value) — default
proj = load_dataset("martincousseau/Cybertruck-Rescue-Sheet")
print(proj["train"][0])

# Nested canonical record
gold = load_dataset("martincousseau/Cybertruck-Rescue-Sheet", "canonical")
record = gold["train"][0]
print(record["vehicle"]["model"], record["document"]["document_id"])
```

## License

MIT for the structured gold (schema, projection, and annotations). Tesla owns the original rescue sheet. Do not treat this dataset as emergency-response guidance.

## Links

- Dataset: [huggingface.co/datasets/martincousseau/Cybertruck-Rescue-Sheet](https://huggingface.co/datasets/martincousseau/Cybertruck-Rescue-Sheet)
- Code: [github.com/martin-cousseau/extraction-arena](https://github.com/martin-cousseau/extraction-arena)
- Video: [Extraction Arena: Evaluate Vision LLMs for Document Extraction](https://youtu.be/QXWN8WyvPmI)
- Tesla sheet: [Cybertruck-Rescue-Sheet.pdf](https://digitalassets.tesla.com/tesla-contents/image/upload/Cybertruck-Rescue-Sheet.pdf)
