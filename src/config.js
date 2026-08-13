import path from "node:path";
import { loadEnvFile } from "./env.js";

loadEnvFile();

const defaultCategories = [
  "sets",
  "uniques",
  "ancients",
  "vintages",
  "chromas",
  "godlies",
  "legendaries",
  "rares",
  "uncommons",
  "commons",
  "pets",
  "misc",
];

function integer(name, fallback, minimum = 0) {
  const value = Number.parseInt(process.env[name] ?? String(fallback), 10);
  if (!Number.isFinite(value) || value < minimum) {
    throw new Error(`${name} must be an integer greater than or equal to ${minimum}`);
  }
  return value;
}

function boolean(name, fallback) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  if (/^(1|true|yes|on)$/i.test(value)) return true;
  if (/^(0|false|no|off)$/i.test(value)) return false;
  throw new Error(`${name} must be true or false`);
}

function categories() {
  const configured = process.env.SOURCE_CATEGORIES;
  const result = configured
    ? configured.split(",").map((value) => value.trim()).filter(Boolean)
    : defaultCategories;

  if (result.length === 0) throw new Error("SOURCE_CATEGORIES must contain at least one category");
  if (result.some((value) => !/^[a-z0-9-]+$/i.test(value))) {
    throw new Error("SOURCE_CATEGORIES contains an invalid category name");
  }
  return [...new Set(result)];
}

export const config = Object.freeze({
  host: process.env.HOST || "127.0.0.1",
  port: integer("PORT", 3000, 1),
  refreshIntervalMs: integer("REFRESH_INTERVAL_MS", 10 * 60 * 1000, 10_000),
  sourceBaseUrl: (process.env.SOURCE_BASE_URL || "https://supremevalues.com/mm2").replace(/\/$/, ""),
  sourceCategories: categories(),
  sourceHeadless: boolean("SOURCE_HEADLESS", true),
  sourceTimeoutMs: integer("SOURCE_TIMEOUT_MS", 90_000, 1_000),
  sourceDelayMs: integer("SOURCE_DELAY_MS", 750, 0),
  browserProfileDir: path.resolve(process.env.BROWSER_PROFILE_DIR || "data/browser-profile"),
  browserExecutablePath: process.env.BROWSER_EXECUTABLE_PATH || undefined,
  cacheFile: path.resolve(process.env.CACHE_FILE || "data/cache.json"),
  logLevel: (process.env.LOG_LEVEL || "info").toLowerCase(),
});
