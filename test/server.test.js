import assert from "node:assert/strict";
import test from "node:test";
import { createApiServer } from "../src/server.js";

const logger = { info() {} };
const item = { id: "godlies:darkshot", slug: "darkshot", name: "Darkshot", category: "godlies", value: 1775 };
const dataset = {
  source: "Supreme Values MM2",
  fetchedAt: "2026-08-12T20:00:00.000Z",
  categoryCount: 1,
  count: 1,
  items: [item],
};
const state = {
  ready: true,
  refreshing: false,
  stale: false,
  ageMs: 0,
  refreshIntervalMs: 600_000,
  lastAttemptAt: dataset.fetchedAt,
  lastSuccessAt: dataset.fetchedAt,
  lastError: null,
  count: 1,
};

test("serves health, values, item lookup, and not-found responses", async (context) => {
  const cache = { state: () => state, getDataset: () => dataset };
  const server = createApiServer(cache, logger);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => server.close());
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  const health = await fetch(`${base}/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).status, "ok");

  const values = await (await fetch(`${base}/values`)).json();
  assert.equal(values.count, 1);
  assert.equal(values.items[0].name, "Darkshot");

  const result = await (await fetch(`${base}/values/DARKSHOT`)).json();
  assert.deepEqual(result.item, item);
  assert.equal((await fetch(`${base}/values/missing`)).status, 404);
});
