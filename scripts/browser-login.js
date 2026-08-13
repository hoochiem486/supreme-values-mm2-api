import fs from "node:fs/promises";
import { chromium } from "playwright";
import { config } from "../src/config.js";

await fs.mkdir(config.browserProfileDir, { recursive: true });
const context = await chromium.launchPersistentContext(config.browserProfileDir, {
  headless: false,
  ...(config.browserExecutablePath ? { executablePath: config.browserExecutablePath } : {}),
});
const page = context.pages()[0] || await context.newPage();
const url = `${config.sourceBaseUrl}/${config.sourceCategories[0]}`;

console.log(`Opening ${url}`);
console.log("Complete any browser challenge in the window. The profile will be saved automatically.");
await page.goto(url, { waitUntil: "domcontentloaded", timeout: config.sourceTimeoutMs });
await page.waitForFunction(
  () => typeof globalThis._svPopup === "object" && globalThis._svPopup !== null,
  null,
  { timeout: 5 * 60 * 1000 },
);
console.log(`_svPopup is available with ${await page.evaluate(() => Object.keys(globalThis._svPopup).length)} items.`);
await context.close();
