# HAR inspection result

Inspected file: `supremevalues.com.har`

The capture contains a successful main-document response with:

- URL: `https://supremevalues.com/mm2/godlies?item=Darkshot`
- Status: `200`
- MIME type: `text/html`
- Embedded assignment: `<script>var _svPopup={...};</script>`
- Top-level shape: an object keyed by display item name
- Captured item count: `128`

The common item shape observed in the capture is:

```json
{
  "value": "1,925",
  "range": "1,925 - 1,975",
  "pctClass": "val-top",
  "pct": 0.9280742459396751,
  "stability": "Doing Well",
  "demand": "6",
  "rarity": "4",
  "origin": "Halloween 2025 (Unboxed)",
  "diff": "+50",
  "pctChange": "+2.7%",
  "aliases": "AB, ALB",
  "flippability": "Flippable",
  "riseChance": "50",
  "wikiLink": "Alienbeam",
  "imageKey": "mm2godlies/Alienbeam",
  "class": "",
  "isExp": true,
  "rawValue": 1925
}
```

Because the captured URL selects `Darkshot`, that item also has two optional fields:

- `history`: array of `{ "v": number, "t": "YYYY-MM-DD HH:mm:ss", "c"?: boolean }`
- `similar`: array of `{ "name", "cat", "value", "range", "demand", "rarity", "image" }`

The navigation in the same captured HTML links to these MM2 categories:

`sets`, `uniques`, `evos`, `ancients`, `vintages`, `chromas`, `godlies`, `legendaries`, `rares`, `uncommons`, `commons`, `pets`, `misc`, and `untradables`.

A browser verification of each linked page found `_svPopup` on 12 value categories. `evos` and `untradables` render different page structures and do not define `_svPopup`, so they are excluded from the default source list. They can still be added through `SOURCE_CATEGORIES` if the source later exposes the same object there.

Re-run the inspection at any time:

```powershell
npm run inspect:har -- "C:\path\to\supremevalues.com.har"
```
