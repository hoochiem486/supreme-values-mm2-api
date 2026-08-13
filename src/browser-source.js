import fs from "node:fs/promises";
import { chromium } from "playwright";
import { extractSvPopup } from "./parser.js";
import { normalizeCategories } from "./normalize.js";

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export function createBrowserLoader(options, logger) {
  return async function loadValues() {
    await fs.mkdir(options.browserProfileDir, { recursive: true });

    const context = await chromium.launchPersistentContext(options.browserProfileDir, {
      headless: options.sourceHeadless,
      ...(options.browserExecutablePath ? { executablePath: options.browserExecutablePath } : {}),
    });

    const page = context.pages()[0] || await context.newPage();
    const categoryResults = [];
    try {
      for (const [index, category] of options.sourceCategories.entries()) {
        const url = `${options.sourceBaseUrl}/${encodeURIComponent(category)}`;
        logger.info("Fetching source category", { category, url });

        const response = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: options.sourceTimeoutMs,
        });
        if (!response) throw new Error(`Navigation returned no response for ${url}`);
        if (!response.ok()) throw new Error(`Source returned HTTP ${response.status()} for ${url}`);

        try {
          await page.waitForFunction(
            () => typeof globalThis._svPopup === "object" && globalThis._svPopup !== null,
            null,
            { timeout: options.sourceTimeoutMs },
          );
        } catch (error) {
          const title = await page.title().catch(() => "unknown");
          throw new Error(`_svPopup did not appear for ${url}; page title: ${title}`, { cause: error });
        }

        const html = await page.content();
        const rawItems = extractSvPopup(html);
        const count = Object.keys(rawItems).length;
        if (count === 0) throw new Error(`_svPopup was empty for ${url}`);

        categoryResults.push({ category, rawItems });
        logger.info("Parsed source category", { category, count });
        if (index < options.sourceCategories.length - 1 && options.sourceDelayMs > 0) {
          await sleep(options.sourceDelayMs);
        }
      }

      const items = normalizeCategories(categoryResults);
      return {
        source: "Supreme Values MM2",
        sourceBaseUrl: options.sourceBaseUrl,
        fetchedAt: new Date().toISOString(),
        categoryCount: categoryResults.length,
        count: items.length,
        items,
      };
    } finally {
      await context.close();
    }
  };
}
