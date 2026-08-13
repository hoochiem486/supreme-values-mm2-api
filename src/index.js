import { config } from "./config.js";
import { createLogger } from "./logger.js";
import { createBrowserLoader } from "./browser-source.js";
import { ValueCache } from "./cache.js";
import { createApiServer } from "./server.js";

const logger = createLogger(config.logLevel);
const loader = createBrowserLoader(config, logger);
const cache = new ValueCache({
  loader,
  refreshIntervalMs: config.refreshIntervalMs,
  cacheFile: config.cacheFile,
  logger,
});

await cache.initialize();
const server = createApiServer(cache, logger);

server.listen(config.port, config.host, () => {
  logger.info("API listening", {
    address: `http://${config.host}:${config.port}`,
    categories: config.sourceCategories,
    refreshIntervalMs: config.refreshIntervalMs,
    headless: config.sourceHeadless,
  });
});

async function shutdown(signal) {
  logger.info("Shutdown requested", { signal });
  cache.stop();
  await new Promise((resolve) => server.close(resolve));
  process.exit(0);
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
