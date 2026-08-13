import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { extractSvPopup } from "../src/parser.js";

const fixture = fs.readFileSync(new URL("./fixtures/supreme-page.html", import.meta.url), "utf8");

test("extracts the HAR-confirmed _svPopup assignment", () => {
  const parsed = extractSvPopup(fixture);
  assert.equal(Object.keys(parsed).length, 3);
  assert.equal(parsed.Alienbeam.rawValue, 1925);
  assert.equal(parsed.Amerilaser.range, "[N/A]");
});

test("handles braces, semicolons, escapes, and whitespace inside the object", () => {
  const parsed = extractSvPopup(fixture);
  assert.equal(parsed["Quote Test"].origin, 'Contains a }; marker and an escaped "quote"');
  assert.deepEqual(extractSvPopup('<script>const _svPopup = {"A":{"rawValue":1}};</script>'), {
    A: { rawValue: 1 },
  });
});

test("reports missing and incomplete assignments", () => {
  assert.throws(() => extractSvPopup("<html></html>"), /No _svPopup/);
  assert.throws(() => extractSvPopup("<script>var _svPopup={</script>"), /incomplete/);
});
