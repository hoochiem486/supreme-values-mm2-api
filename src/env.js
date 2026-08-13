import fs from "node:fs";
import path from "node:path";

/** Load a small KEY=value .env file without adding another dependency. */
export function loadEnvFile(file = path.resolve(".env")) {
  if (!fs.existsSync(file)) return;

  for (const sourceLine of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = sourceLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator < 1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) process.env[key] = value;
  }
}
