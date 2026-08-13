function nullableNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !value.trim() || /n\/?a/i.test(value)) return null;
  const parsed = Number(value.replace(/[,%+\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeRange(value) {
  if (typeof value !== "string" || /n\/?a/i.test(value)) return null;
  const parts = value.split(/\s+-\s+/).map(nullableNumber);
  if (parts.length !== 2 || parts.some((part) => part === null)) return null;
  return { min: parts[0], max: parts[1], display: value };
}

function normalizeAliases(value) {
  if (typeof value !== "string" || /^n\/?a$/i.test(value.trim())) return [];
  return value.split(",").map((alias) => alias.trim()).filter(Boolean);
}

function normalizeValue(raw) {
  const display = raw.value;
  const numeric = nullableNumber(raw.rawValue ?? display);
  if (numeric !== null) {
    return { value: numeric, valueType: "numeric", tieredValue: null };
  }

  const tieredMatch = typeof display === "string"
    ? display.trim().match(/^x(\d+)\s+T(\d+)\s+(commons?|uncommons?|rares?|legendary|legendaries)$/i)
    : null;
  if (tieredMatch) {
    const sourceRarity = tieredMatch[3].toLowerCase();
    const rarity = sourceRarity === "legendaries"
      ? "legendary"
      : sourceRarity.replace(/s$/, "");
    return {
      value: null,
      valueType: "tiered-items",
      tieredValue: {
        quantity: Number(tieredMatch[1]),
        tier: Number(tieredMatch[2]),
        rarity,
      },
    };
  }

  return { value: null, valueType: "unknown", tieredValue: null };
}

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return undefined;
  return history.map((entry) => ({
    value: nullableNumber(entry.v),
    timestamp: entry.t,
    ...(entry.c === undefined ? {} : { changed: Boolean(entry.c) }),
  }));
}

function normalizeSimilar(similar) {
  if (!Array.isArray(similar)) return undefined;
  return similar.map((item) => ({
    name: item.name,
    category: item.cat,
    value: nullableNumber(item.value),
    valueDisplay: item.value,
    range: normalizeRange(item.range),
    demand: nullableNumber(item.demand),
    rarity: nullableNumber(item.rarity),
    imageKey: item.image,
  }));
}

export function normalizeItem(name, category, raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`Item ${name} in ${category} is not an object`);
  }

  const slug = slugify(name);
  const normalizedValue = normalizeValue(raw);
  if (!slug) throw new Error(`Item ${name} in ${category} has no usable name`);

  const item = {
    id: `${category}:${slug}`,
    slug,
    name,
    category,
    ...normalizedValue,
    valueDisplay: raw.value,
    range: normalizeRange(raw.range),
    score: nullableNumber(raw.pct),
    scoreClass: raw.pctClass || null,
    stability: raw.stability || null,
    demand: nullableNumber(raw.demand),
    rarity: nullableNumber(raw.rarity),
    origin: raw.origin || null,
    difference: nullableNumber(raw.diff),
    percentageChange: nullableNumber(raw.pctChange),
    aliases: normalizeAliases(raw.aliases),
    flippability: raw.flippability || null,
    riseChance: nullableNumber(raw.riseChance),
    wikiLink: raw.wikiLink || null,
    imageKey: raw.imageKey || null,
    className: raw.class || null,
    isExp: Boolean(raw.isExp),
  };

  const history = normalizeHistory(raw.history);
  const similar = normalizeSimilar(raw.similar);
  if (history) item.history = history;
  if (similar) item.similar = similar;
  return item;
}

export function normalizeCategories(categoryResults) {
  const items = [];
  const ids = new Set();
  for (const { category, rawItems } of categoryResults) {
    for (const [name, raw] of Object.entries(rawItems)) {
      const item = normalizeItem(name, category, raw);
      if (ids.has(item.id)) throw new Error(`Duplicate normalized item id: ${item.id}`);
      ids.add(item.id);
      items.push(item);
    }
  }

  items.sort((left, right) => left.name.localeCompare(right.name) || left.category.localeCompare(right.category));
  return items;
}

export function findItems(items, query) {
  const needle = query.trim().toLowerCase();
  return items.filter((item) =>
    item.id.toLowerCase() === needle ||
    item.slug === needle ||
    item.name.toLowerCase() === needle
  );
}
