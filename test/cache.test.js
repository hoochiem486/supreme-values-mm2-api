import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { ValueCache } from "../src/cache.js";

const logger = { debug() {}, info() {}, warn() {}, error() {} };

test("retains the last successful dataset when refresh fails", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "sv-cache-"));
  const cacheFile = path.join(directory, "cache.json");
  let call = 0;
  const good = {
    source: "test",
    fetchedAt: "2026-08-12T20:00:00.000Z",
    categoryCount: 1,
    count: 1,
    items: [{ id: "godlies:test", slug: "test", name: "Test", category: "godlies", value: 1 }],
  };
  const cache = new ValueCache({
    loader: async () => {
      call += 1;
      if (call === 1) return good;
      throw new Error("temporary source failure");
    },
    refreshIntervalMs: 600_000,
    cacheFile,
    logger,
  });

  assert.equal(await cache.refresh("test-success"), true);
  assert.equal(await cache.refresh("test-failure"), false);
  assert.equal(cache.getDataset(), good);
  assert.equal(cache.state().lastError.message, "temporary source failure");
  assert.deepEqual(JSON.parse(await fs.readFile(cacheFile, "utf8")), good);
});
