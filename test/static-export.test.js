import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { exportStaticDataset } from "../src/static-export.js";

test("exports full, health, lookup, and individual-item JSON files", async (context) => {
  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mm2-static-export-"));
  context.after(() => fs.rm(temporaryRoot, { recursive: true, force: true }));

  const dataset = {
    source: "Supreme Values MM2",
    fetchedAt: "2026-08-13T00:00:00.000Z",
    categoryCount: 1,
    count: 1,
    items: [{ id: "godlies:test-item", slug: "test-item", name: "Test Item", category: "godlies", value: 5 }],
  };

  const outputDir = path.join(temporaryRoot, "docs");
  await exportStaticDataset(dataset, { outputDir });

  const values = JSON.parse(await fs.readFile(path.join(outputDir, "values.json"), "utf8"));
  const health = JSON.parse(await fs.readFile(path.join(outputDir, "health.json"), "utf8"));
  const lookup = JSON.parse(await fs.readFile(path.join(outputDir, "lookup.json"), "utf8"));
  const item = JSON.parse(await fs.readFile(path.join(outputDir, "values", "godlies", "test-item.json"), "utf8"));

  assert.equal(values.count, 1);
  assert.equal(health.status, "ok");
  assert.equal(lookup.byId["godlies:test-item"], "values/godlies/test-item.json");
  assert.equal(item.name, "Test Item");
});

