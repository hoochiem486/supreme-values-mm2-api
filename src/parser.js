const assignmentPattern = /(?:\b(?:var|let|const)\s+)?_svPopup\s*=\s*/g;

/**
 * Extract the JSON-compatible object assigned to `_svPopup` in an HTML page.
 * A balanced scanner is used instead of a greedy regular expression so braces
 * and semicolons inside JSON strings are handled correctly.
 */
export function extractSvPopup(html) {
  if (typeof html !== "string") throw new TypeError("HTML must be a string");

  assignmentPattern.lastIndex = 0;
  const match = assignmentPattern.exec(html);
  if (!match) throw new Error("No _svPopup assignment was found in the page");

  let start = match.index + match[0].length;
  while (/\s/.test(html[start] || "")) start += 1;
  if (html[start] !== "{") throw new Error("_svPopup is not assigned an object literal");

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < html.length; index += 1) {
    const character = html[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }

    if (character === '"') inString = true;
    else if (character === "{") depth += 1;
    else if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        const source = html.slice(start, index + 1);
        let parsed;
        try {
          parsed = JSON.parse(source);
        } catch (error) {
          throw new Error("The _svPopup object is not valid JSON", { cause: error });
        }
        if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
          throw new Error("The _svPopup value is not an object");
        }
        return parsed;
      }
    }
  }

  throw new Error("The _svPopup object is incomplete");
}
