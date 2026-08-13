# Verification report

Verified locally on 2026-08-12 (America/New_York).

## Supplied HAR

`scripts/inspect-har.js` successfully parsed the provided capture:

- Document status: 200
- MIME type: `text/html`
- `_svPopup` items: 128
- Observed fields: 20, including optional `history` and `similar`

## Browser source integration

Playwright was launched headlessly against the locally installed Chrome executable. A complete refresh succeeded for every page that currently exposes `_svPopup`:

| Category | Items |
|---|---:|
| sets | 106 |
| uniques | 1 |
| ancients | 13 |
| vintages | 10 |
| chromas | 48 |
| godlies | 128 |
| legendaries | 76 |
| rares | 124 |
| uncommons | 177 |
| commons | 280 |
| pets | 77 |
| misc | 13 |
| **Total** | **1,053** |

The live `evos` and `untradables` pages returned HTTP 200 normal pages but did not define `_svPopup`, so they are documented and excluded from the default parser-backed refresh set.

The final normalized value forms were:

- 534 numeric values
- 515 structured tier-exchange values
- 4 pet entries whose source value string was empty; these are retained with `valueType: "unknown"`

The verified last-good dataset is included at `data/cache.json`.

## Automated and endpoint tests

- 8 tests passed with Node's built-in test runner.
- Parser fixture: passed.
- Normalization and tier-value parsing: passed.
- Last-good cache retention after refresh failure: passed.
- API route tests: passed.
- Snapshot-backed endpoint smoke test:
  - `/health` → `ok`
  - `/values` → 1,053 items
  - `/values/Darkshot` → HTTP 200, category `godlies`, numeric value `1775`
