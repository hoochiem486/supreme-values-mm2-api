import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../src/config.js";
import { createLogger } from "../src/logger.js";
import { createBrowserLoader } from "../src/browser-source.js";
import { exportStaticDataset } from "../src/static-export.js";

const logger = createLogger(config.logLevel);
const loader = createBrowserLoader(config, logger);
const valuesFile = path.resolve("docs/values.json");

function validate(dataset) {
  if (!dataset || !Array.isArray(dataset.items) || dataset.items.length === 0) {
    throw new Error("Dataset has no items");
  }
  if (dataset.count !== dataset.items.length) {
    throw new Error("Dataset count does not match its items array");
  }
}

try {
  logger.info("GitHub Pages refresh started");
  const dataset = await loader();
  validate(dataset);
  await exportStaticDataset(dataset);
  await fs.mkdir(path.dirname(config.cacheFile), { recursive: true });
  await fs.writeFile(config.cacheFile, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
  logger.info("GitHub Pages refresh completed", { count: dataset.count, fetchedAt: dataset.fetchedAt });
} catch (error) {
  logger.error("GitHub Pages refresh failed", { error });

  try {
    const existing = JSON.parse(await fs.readFile(valuesFile, "utf8"));
    validate(existing);
    logger.warn("Retaining the previously published dataset", {
      count: existing.count,
      fetchedAt: existing.fetchedAt,
    });
  } catch (fallbackError) {
    logger.error("No previously published dataset is available", { error: fallbackError });
    process.exitCode = 1;
  }
}

