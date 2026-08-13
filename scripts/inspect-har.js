import fs from "node:fs";
import path from "node:path";
import { extractSvPopup } from "../src/parser.js";

const harPath = process.argv[2];
if (!harPath) {
  console.error("Usage: npm run inspect:har -- /path/to/capture.har");
  process.exit(1);
}

const har = JSON.parse(fs.readFileSync(path.resolve(harPath), "utf8").replace(/^\uFEFF/, ""));
const reports = [];

for (const entry of har?.log?.entries || []) {
  const content = entry?.response?.content || {};
  let html = content.text || "";
  if (content.encoding === "base64") html = Buffer.from(html, "base64").toString("utf8");
  if (!html.includes("_svPopup")) continue;

  let items;
  try {
    items = extractSvPopup(html);
  } catch (error) {
    // External JavaScript may refer to the global without assigning its data.
    if (/No _svPopup assignment/.test(error.message)) continue;
    throw error;
  }
  const allFields = [...new Set(Object.values(items).flatMap((item) => Object.keys(item)))].sort();
  reports.push({
    url: entry.request?.url,
    status: entry.response?.status,
    mimeType: content.mimeType,
    itemCount: Object.keys(items).length,
    firstItems: Object.keys(items).slice(0, 10),
    fields: allFields,
  });
}

if (reports.length === 0) throw new Error("No HAR response containing _svPopup was found");
console.log(JSON.stringify(reports, null, 2));
