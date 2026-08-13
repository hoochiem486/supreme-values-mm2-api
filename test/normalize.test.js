import assert from "node:assert/strict";
import test from "node:test";
import { findItems, normalizeItem } from "../src/normalize.js";

const raw = {
  value: "1,925",
  range: "1,925 - 1,975",
  pctClass: "val-top",
  pct: 0.928,
  stability: "Doing Well",
  demand: "6",
  rarity: "4",
  origin: "Halloween 2025 (Unboxed)",
  diff: "+50",
  pctChange: "+2.7%",
  aliases: "AB, ALB",
  flippability: "Flippable",
  riseChance: "50",
  wikiLink: "Alienbeam",
  imageKey: "mm2godlies/Alienbeam",
  class: "",
  isExp: true,
  rawValue: 1925,
  history: [{ v: 1900, t: "2026-08-10 15:00:00", c: true }],
};

test("normalizes display strings into clean JSON types", () => {
  const item = normalizeItem("Alienbeam", "godlies", raw);
  assert.equal(item.id, "godlies:alienbeam");
  assert.equal(item.value, 1925);
  assert.deepEqual(item.range, { min: 1925, max: 1975, display: "1,925 - 1,975" });
  assert.equal(item.difference, 50);
  assert.equal(item.percentageChange, 2.7);
  assert.deepEqual(item.aliases, ["AB", "ALB"]);
  assert.deepEqual(item.history[0], {
    value: 1900,
    timestamp: "2026-08-10 15:00:00",
    changed: true,
  });
});

test("supports id, slug, and case-insensitive name lookup", () => {
  const item = normalizeItem("Alien Beam", "godlies", raw);
  assert.deepEqual(findItems([item], "godlies:alien-beam"), [item]);
  assert.deepEqual(findItems([item], "alien-beam"), [item]);
  assert.deepEqual(findItems([item], "ALIEN BEAM"), [item]);
});

test("structures lower-tier exchange values without discarding their display form", () => {
  const item = normalizeItem("8Bit", "commons", {
    ...raw,
    value: "x4 T1 Legendaries",
    rawValue: null,
    range: "[N/A]",
  });
  assert.equal(item.value, null);
  assert.equal(item.valueType, "tiered-items");
  assert.equal(item.valueDisplay, "x4 T1 Legendaries");
  assert.deepEqual(item.tieredValue, { quantity: 4, tier: 1, rarity: "legendary" });
});
