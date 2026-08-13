import fs from "node:fs/promises";
import path from "node:path";

const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

function validateDataset(dataset) {
  if (!dataset || !Array.isArray(dataset.items) || dataset.items.length === 0) {
    throw new Error("Static export requires a non-empty items array");
  }
  if (dataset.count !== dataset.items.length) {
    throw new Error("Static export item count does not match the dataset count");
  }
}

function safeSegment(value, label) {
  if (typeof value !== "string" || !/^[a-z0-9-]+$/i.test(value)) {
    throw new Error(`Invalid ${label} path segment: ${value}`);
  }
  return value.toLowerCase();
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function swapDirectories(nextDir, outputDir, previousDir) {
  await fs.rm(previousDir, { recursive: true, force: true });

  let hadPrevious = false;
  try {
    await fs.rename(outputDir, previousDir);
    hadPrevious = true;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  try {
    await fs.rename(nextDir, outputDir);
  } catch (error) {
    if (hadPrevious) await fs.rename(previousDir, outputDir);
    throw error;
  }

  await fs.rm(previousDir, { recursive: true, force: true });
}

export async function exportStaticDataset(dataset, options = {}) {
  validateDataset(dataset);

  const outputDir = path.resolve(options.outputDir || "docs");
  const nextDir = `${outputDir}.next`;
  const previousDir = `${outputDir}.previous`;
  const publishedAt = new Date().toISOString();
  const cache = {
    ready: true,
    refreshing: false,
    stale: false,
    refreshIntervalMs: REFRESH_INTERVAL_MS,
    lastSuccessAt: dataset.fetchedAt,
    count: dataset.count,
  };

  await fs.rm(nextDir, { recursive: true, force: true });
  await fs.mkdir(nextDir, { recursive: true });
  await fs.writeFile(path.join(nextDir, ".nojekyll"), "", "utf8");

  await writeJson(path.join(nextDir, "values.json"), { ...dataset, cache });
  await writeJson(path.join(nextDir, "health.json"), {
    status: "ok",
    mode: "github-pages-static",
    fetchedAt: dataset.fetchedAt,
    publishedAt,
    count: dataset.count,
    refreshIntervalMs: REFRESH_INTERVAL_MS,
  });

  const lookup = { byId: {}, bySlug: {}, byName: {} };
  for (const item of dataset.items) {
    const category = safeSegment(item.category, "category");
    const slug = safeSegment(item.slug, "slug");
    const relativeUrl = `values/${category}/${slug}.json`;

    await writeJson(path.join(nextDir, ...relativeUrl.split("/")), item);
    lookup.byId[item.id.toLowerCase()] = relativeUrl;

    const slugMatches = lookup.bySlug[item.slug] || [];
    slugMatches.push(relativeUrl);
    lookup.bySlug[item.slug] = slugMatches;

    const nameKey = item.name.toLowerCase();
    const nameMatches = lookup.byName[nameKey] || [];
    nameMatches.push(relativeUrl);
    lookup.byName[nameKey] = nameMatches;
  }

  await writeJson(path.join(nextDir, "lookup.json"), lookup);
  await fs.writeFile(
    path.join(nextDir, "index.html"),
    `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>MM2 Values JSON</title>
<style>body{font:16px system-ui;max-width:760px;margin:48px auto;padding:0 20px;line-height:1.5}code{background:#eee;padding:2px 5px}a{display:block;margin:8px 0}</style>
<h1>MM2 Values JSON</h1>
<p>Last source refresh: <code>${dataset.fetchedAt}</code></p>
<p>Items: <code>${dataset.count}</code></p>
<a href="values.json">All values</a>
<a href="health.json">Health</a>
<a href="lookup.json">Item lookup index</a>
<p>Individual item files use <code>values/&lt;category&gt;/&lt;slug&gt;.json</code>.</p>
</html>
`,
    "utf8",
  );

  await swapDirectories(nextDir, outputDir, previousDir);
  return { outputDir, count: dataset.count, publishedAt };
}

