# MM2 Values JSON — LLM and Client Usage Guide

This is a public, read-only JSON dataset of normalized Supreme Values MM2 item data. It is refreshed by GitHub Actions approximately every 10 minutes and retains the last successful dataset when a refresh fails.

## Base URL

```text
https://hoochiem486.github.io/supreme-values-mm2-api
```

No API key is required. Use HTTPS `GET` requests.

## Endpoints

| Purpose | URL |
|---|---|
| Complete dataset | `https://hoochiem486.github.io/supreme-values-mm2-api/values.json` |
| Health and freshness | `https://hoochiem486.github.io/supreme-values-mm2-api/health.json` |
| Lookup index | `https://hoochiem486.github.io/supreme-values-mm2-api/lookup.json` |
| One item | `https://hoochiem486.github.io/supreme-values-mm2-api/values/<category>/<slug>.json` |
| This LLM guide | `https://hoochiem486.github.io/supreme-values-mm2-api/llms.txt` |

Example individual item:

```text
https://hoochiem486.github.io/supreme-values-mm2-api/values/godlies/alienbeam.json
```

GitHub Pages is static hosting, so the filenames and `.json` extensions are required. There is no dynamic `/values/:item` route.

## Recommended access pattern

For most applications and LLM tools:

1. Download `values.json` once.
2. Cache it locally for 5–10 minutes.
3. Find items locally in its `items` array.
4. Match a query case-insensitively against `id`, `slug`, or `name`.
5. If more than one item has the same name or slug, ask for or use its unique `id`, such as `commons:zombie`.
6. Check `health.json` when freshness information is important.

Use `lookup.json` when downloading the full dataset is undesirable. It contains:

```json
{
  "byId": {
    "godlies:alienbeam": "values/godlies/alienbeam.json"
  },
  "bySlug": {
    "alienbeam": ["values/godlies/alienbeam.json"]
  },
  "byName": {
    "alienbeam": ["values/godlies/alienbeam.json"]
  }
}
```

`bySlug` and `byName` return arrays because some names occur in multiple categories. Join the returned relative path to the base URL.

## Complete dataset shape

`values.json` returns:

```json
{
  "source": "Supreme Values MM2",
  "sourceBaseUrl": "https://supremevalues.com/mm2",
  "fetchedAt": "2026-08-13T07:58:19.341Z",
  "categoryCount": 12,
  "count": 1053,
  "items": [],
  "cache": {
    "ready": true,
    "refreshing": false,
    "stale": false,
    "refreshIntervalMs": 600000,
    "lastSuccessAt": "2026-08-13T07:58:19.341Z",
    "count": 1053
  }
}
```

Treat `count` and timestamps as changing values rather than constants.

## Item shape

An individual item file returns the item object directly:

```json
{
  "id": "godlies:alienbeam",
  "slug": "alienbeam",
  "name": "Alienbeam",
  "category": "godlies",
  "value": 1925,
  "valueType": "numeric",
  "tieredValue": null,
  "valueDisplay": "1,925",
  "range": {
    "min": 1925,
    "max": 1975,
    "display": "1,925 - 1,975"
  },
  "score": 0.9280742459396751,
  "scoreClass": "val-top",
  "stability": "Doing Well",
  "demand": 6,
  "rarity": 4,
  "origin": "Halloween 2025 (Unboxed)",
  "difference": 50,
  "percentageChange": 2.7,
  "aliases": ["AB", "ALB"],
  "flippability": "Flippable",
  "riseChance": 50,
  "wikiLink": "Alienbeam",
  "imageKey": "mm2godlies/Alienbeam",
  "className": null,
  "isExp": true
}
```

Some items additionally contain `history` or `similar`. Nullable fields must be handled as JSON `null`.

## Interpreting values

### Numeric value

```json
{
  "valueType": "numeric",
  "value": 1925,
  "valueDisplay": "1,925"
}
```

Use `value` for calculations and `valueDisplay` when showing the source-formatted value.

### Tiered exchange value

Some lower-tier items are valued in other items rather than a numeric Supreme value:

```json
{
  "valueType": "tiered-items",
  "value": null,
  "valueDisplay": "x4 T1 Legendaries",
  "tieredValue": {
    "quantity": 4,
    "tier": 1,
    "rarity": "legendary"
  }
}
```

Do not treat a `null` numeric value as zero. Use `tieredValue` or `valueDisplay` instead.

### Unknown value

If `valueType` is `unknown`, report `valueDisplay` as supplied and avoid inventing a numeric value.

### Ranges

When `range` is present, explain both ends of the range. When it is `null`, use the main `value` or `valueDisplay`.

## JavaScript example

```js
const BASE = "https://hoochiem486.github.io/supreme-values-mm2-api";

const response = await fetch(`${BASE}/values.json`);
if (!response.ok) throw new Error(`HTTP ${response.status}`);

const dataset = await response.json();
const query = "alienbeam".toLowerCase();
const matches = dataset.items.filter((item) =>
  item.id.toLowerCase() === query ||
  item.slug.toLowerCase() === query ||
  item.name.toLowerCase() === query
);

console.log(matches);
```

## Python example

```python
import requests

BASE = "https://hoochiem486.github.io/supreme-values-mm2-api"
dataset = requests.get(f"{BASE}/values.json", timeout=30).json()

query = "alienbeam".casefold()
matches = [
    item for item in dataset["items"]
    if query in {
        item["id"].casefold(),
        item["slug"].casefold(),
        item["name"].casefold(),
    }
]

print(matches)
```

## Roblox-client-style environment

The repository includes `roblox/Client/MM2ValuesPages.lua` for environments that expose `request`, `http_request`, or `syn.request`. It downloads `values.json` once and creates local indexes for later lookups.

Basic use:

```lua
local MM2Values = require(path.to.MM2ValuesPages)

local item = MM2Values.GetItem("Alienbeam")
if item then
	print(item.name, item.valueDisplay)
end
```

## Instructions to give an LLM

Copy this prompt when the LLM has an HTTP, browsing, or fetch tool:

```text
Use the MM2 Values JSON dataset at:
https://hoochiem486.github.io/supreme-values-mm2-api/values.json

Fetch the JSON before answering value questions. Match item queries case-insensitively against id, slug, and name. Do not guess missing values. For valueType "numeric", use value for calculations and valueDisplay for presentation. For valueType "tiered-items", explain tieredValue and do not interpret null value as zero. If multiple items match, list their category-qualified ids and ask which one is intended. Mention range.min and range.max when range is present. Use fetchedAt to state data freshness when asked.
```

If the LLM does not have network access, have the calling application fetch `values.json` and include the relevant item object in the prompt.

## Reliability notes

- The endpoint is read-only and requires no credentials.
- Refreshes are scheduled approximately every 10 minutes; GitHub may occasionally delay scheduled jobs.
- A refresh is published only after all configured source categories succeed.
- The last published dataset remains available if collection fails.
- Clients should use a timeout, check the HTTP status, and keep their own last successful response when appropriate.
