# Supreme Values MM2 JSON API

A small Node.js service that reads the authorized MM2 value pages in Chromium, extracts the inline `_svPopup` object, normalizes its string fields, and serves a cached JSON dataset.

## Behavior

- Uses Playwright with a persistent Chromium profile, which lets a normal browser session complete the source page flow and retain its cookies.
- Visits the 12 MM2 category pages that currently expose `_svPopup`, sequentially with a small delay.
- Parses the exact HAR-confirmed `var _svPopup={...};` structure with a balanced-object scanner.
- Commits a refresh only after every configured category succeeds.
- Refreshes every 10 minutes by default and deduplicates overlapping refreshes.
- Keeps the last successful in-memory dataset after an error.
- Atomically persists the last successful dataset to `data/cache.json`, so it also survives process restarts.
- Emits one-line structured JSON logs.
- Uses only Node's HTTP server at runtime; Playwright is the sole package dependency.

See [HAR_INSPECTION.md](HAR_INSPECTION.md) for the captured schema and field details.

## Install and run

Requires Node.js 20 or later.

```powershell
Copy-Item .env.example .env
npm install
npx playwright install chromium
npm start
```

The server begins listening immediately. Until the first refresh succeeds, `/health` and `/values` return HTTP 503. If `data/cache.json` already exists, it is served while the new refresh runs.

Test it locally:

```powershell
Invoke-RestMethod http://127.0.0.1:3000/health
Invoke-RestMethod http://127.0.0.1:3000/values
Invoke-RestMethod http://127.0.0.1:3000/values/Darkshot
Invoke-RestMethod "http://127.0.0.1:3000/values/godlies%3Adarkshot"
```

### Browser challenge/profile setup

The service uses `data/browser-profile` for persistent browser state. If the first headless refresh reaches a challenge page, initialize that profile once in a visible browser:

```powershell
npm run browser:login
```

Complete the page in the window. The helper waits until `_svPopup` is present, prints its item count, closes Chromium, and leaves the saved profile for `npm start`.

For troubleshooting, set `SOURCE_HEADLESS=false` in `.env` and start the service from a desktop session. `BROWSER_EXECUTABLE_PATH` can point Playwright at an existing Chrome/Chromium executable instead of its bundled browser.

## API

### `GET /values`

Returns metadata, cache state, and all normalized items:

```json
{
  "source": "Supreme Values MM2",
  "fetchedAt": "2026-08-12T20:00:00.000Z",
  "categoryCount": 12,
  "count": 500,
  "items": [
    {
      "id": "godlies:alienbeam",
      "slug": "alienbeam",
      "name": "Alienbeam",
      "category": "godlies",
      "value": 1925,
      "valueType": "numeric",
      "tieredValue": null,
      "valueDisplay": "1,925",
      "range": { "min": 1925, "max": 1975, "display": "1,925 - 1,975" },
      "demand": 6,
      "rarity": 4,
      "aliases": ["AB", "ALB"]
    }
  ],
  "cache": {
    "ready": true,
    "refreshing": false,
    "stale": false,
    "refreshIntervalMs": 600000
  }
}
```

`range` is `null` for `[N/A]`. Numeric source strings such as demand, rarity, changes, percentages, and rise chance become JSON numbers. Display strings remain in `valueDisplay` and `range.display`. Lower-tier exchange values such as `x4 T1 Legendaries` use `valueType: "tiered-items"`, `value: null`, and a structured `tieredValue` object containing `quantity`, `tier`, and singular `rarity`.

### `GET /values/:item`

Looks up an item case-insensitively by display name, slug, or unique `category:slug` id. If a name exists in multiple categories, the endpoint returns HTTP 409 with the matching ids; request one of those ids on the next call.

### `GET /health`

- `200 { "status": "ok" }`: a dataset is available and the latest refresh succeeded.
- `200 { "status": "degraded" }`: cached data is available but the latest refresh failed.
- `503 { "status": "starting" }`: no successful dataset is available yet.

## Configuration

All settings can be supplied in `.env` or as process environment variables.

| Variable | Default | Purpose |
|---|---:|---|
| `HOST` | `127.0.0.1` | Listener interface |
| `PORT` | `3000` | Listener port |
| `REFRESH_INTERVAL_MS` | `600000` | Source refresh interval |
| `SOURCE_BASE_URL` | `https://supremevalues.com/mm2` | MM2 page base URL |
| `SOURCE_CATEGORIES` | 12 `_svPopup` value categories | Comma-separated category paths |
| `SOURCE_HEADLESS` | `true` | Chromium display mode |
| `SOURCE_TIMEOUT_MS` | `90000` | Navigation/object wait timeout |
| `SOURCE_DELAY_MS` | `750` | Delay between category pages |
| `BROWSER_PROFILE_DIR` | `data/browser-profile` | Persistent Chromium state |
| `BROWSER_EXECUTABLE_PATH` | unset | Existing Chromium/Chrome executable |
| `CACHE_FILE` | `data/cache.json` | Last-good disk snapshot |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, or `error` |

## Roblox setup

1. In Roblox Studio, enable **Game Settings → Security → Allow HTTP Requests**.
2. Copy the three files under `roblox/ServerScriptService` into `ServerScriptService` with the same names/types.
3. Set `API_BASE_URL` in `MM2ValuesApi` to the deployed HTTPS API address.
4. Optionally copy the LocalScript example into `StarterPlayerScripts`.

`MM2ValuesCache` fetches `/values` only from a Roblox server, builds an in-memory lookup, refreshes it every five minutes, and retains its last result on an API error. `MM2ValuesRemote.server` exposes only item lookup through `ReplicatedStorage.GetMM2Value`, validates input, and applies a per-player cooldown. Clients never call the web API directly.

## Tests and HAR inspection

```powershell
npm test
npm run inspect:har -- "C:\path\to\supremevalues.com.har"
```

The unit tests cover the inline parser, normalization, item lookup, route responses, and last-good refresh behavior. The fixture is a minimal extract matching the supplied HAR rather than a copy of the full captured dataset.

## Docker deployment

After `npm install` has generated `package-lock.json`:

```powershell
docker compose up --build
```

The named `supreme-values-data` volume persists both the Chromium profile and `cache.json`. Set the host environment variables shown above in your deployment platform, mount `/app/data`, expose port 3000, and terminate HTTPS at the platform's proxy before pointing Roblox at it.

## Free GitHub Pages endpoint

The repository also includes `.github/workflows/refresh-pages.yml`. It runs the browser collector approximately every ten minutes, exports static JSON, and deploys `docs/` to GitHub Pages. A failed refresh leaves the last published files unchanged.

Static endpoints use file names because GitHub Pages does not run the Node HTTP server:

- `https://<account>.github.io/<repository>/values.json` — complete dataset
- `https://<account>.github.io/<repository>/health.json` — publication status
- `https://<account>.github.io/<repository>/lookup.json` — name, slug, and id lookup index
- `https://<account>.github.io/<repository>/values/<category>/<slug>.json` — one item

For this repository the expected base URL is:

```text
https://hoochiem486.github.io/supreme-values-mm2-api
```

On GitHub Free, make the repository public. Then open **Settings → Pages** and set **Source** to **GitHub Actions**. Open **Actions → Refresh and publish MM2 values → Run workflow** for the first deployment.

For a client environment with an HTTP request function, use `roblox/Client/MM2ValuesPages.lua`. It downloads `values.json` once and performs subsequent item lookups from its local table.
