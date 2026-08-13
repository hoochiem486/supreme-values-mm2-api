import fs from "node:fs/promises";
import path from "node:path";

export class ValueCache {
  constructor({ loader, refreshIntervalMs, cacheFile, logger }) {
    this.loader = loader;
    this.refreshIntervalMs = refreshIntervalMs;
    this.cacheFile = cacheFile;
    this.logger = logger;
    this.dataset = null;
    this.lastAttemptAt = null;
    this.lastSuccessAt = null;
    this.lastError = null;
    this.refreshPromise = null;
    this.timer = null;
  }

  async initialize() {
    await this.loadSnapshot();
    this.timer = setInterval(() => void this.refresh("scheduled"), this.refreshIntervalMs);
    this.timer.unref?.();
    void this.refresh("startup");
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async loadSnapshot() {
    try {
      const dataset = JSON.parse(await fs.readFile(this.cacheFile, "utf8"));
      this.validate(dataset);
      this.dataset = dataset;
      this.lastSuccessAt = dataset.fetchedAt;
      this.logger.info("Loaded cache snapshot", { file: this.cacheFile, count: dataset.count });
    } catch (error) {
      if (error?.code !== "ENOENT") this.logger.warn("Cache snapshot was ignored", { error });
    }
  }

  validate(dataset) {
    if (!dataset || !Array.isArray(dataset.items) || dataset.items.length === 0) {
      throw new Error("Refreshed dataset has no items");
    }
    if (dataset.count !== dataset.items.length) {
      throw new Error("Refreshed dataset count does not match its items array");
    }
  }

  refresh(reason = "manual") {
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      this.lastAttemptAt = new Date().toISOString();
      this.logger.info("Value refresh started", { reason });
      try {
        const candidate = await this.loader();
        this.validate(candidate);
        await this.saveSnapshot(candidate);
        this.dataset = candidate;
        this.lastSuccessAt = candidate.fetchedAt;
        this.lastError = null;
        this.logger.info("Value refresh completed", {
          reason,
          count: candidate.count,
          categories: candidate.categoryCount,
        });
        return true;
      } catch (error) {
        this.lastError = { at: new Date().toISOString(), message: error.message };
        this.logger.error("Value refresh failed; retaining last successful dataset", {
          reason,
          hasDataset: Boolean(this.dataset),
          error,
        });
        return false;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async saveSnapshot(dataset) {
    await fs.mkdir(path.dirname(this.cacheFile), { recursive: true });
    const temporary = `${this.cacheFile}.tmp`;
    await fs.writeFile(temporary, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
    await fs.rename(temporary, this.cacheFile);
  }

  state() {
    const ageMs = this.lastSuccessAt ? Date.now() - Date.parse(this.lastSuccessAt) : null;
    return {
      ready: Boolean(this.dataset),
      refreshing: Boolean(this.refreshPromise),
      stale: ageMs === null || ageMs > this.refreshIntervalMs * 2,
      ageMs,
      refreshIntervalMs: this.refreshIntervalMs,
      lastAttemptAt: this.lastAttemptAt,
      lastSuccessAt: this.lastSuccessAt,
      lastError: this.lastError,
      count: this.dataset?.count ?? 0,
    };
  }

  getDataset() {
    return this.dataset;
  }
}
