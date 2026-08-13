import http from "node:http";
import { findItems } from "./normalize.js";

function sendJson(response, status, body, cacheControl = "no-store") {
  const json = JSON.stringify(body);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(json),
    "Cache-Control": cacheControl,
    "X-Content-Type-Options": "nosniff",
  });
  response.end(json);
}

export function createApiServer(cache, logger) {
  return http.createServer((request, response) => {
    const started = performance.now();
    const url = new URL(request.url, "http://localhost");

    response.once("finish", () => {
      logger.info("HTTP request", {
        method: request.method,
        path: url.pathname,
        status: response.statusCode,
        durationMs: Math.round((performance.now() - started) * 10) / 10,
      });
    });

    if (request.method !== "GET") {
      response.setHeader("Allow", "GET");
      return sendJson(response, 405, { error: "Method not allowed" });
    }

    if (url.pathname === "/health") {
      const state = cache.state();
      const status = !state.ready ? "starting" : state.lastError ? "degraded" : "ok";
      return sendJson(response, state.ready ? 200 : 503, { status, cache: state });
    }

    const dataset = cache.getDataset();
    if (!dataset && (url.pathname === "/values" || url.pathname.startsWith("/values/"))) {
      return sendJson(response, 503, {
        error: "The first dataset refresh is still pending",
        cache: cache.state(),
      });
    }

    if (url.pathname === "/values") {
      return sendJson(
        response,
        200,
        { ...dataset, cache: cache.state() },
        "public, max-age=60, stale-if-error=600",
      );
    }

    if (url.pathname.startsWith("/values/")) {
      let query;
      try {
        query = decodeURIComponent(url.pathname.slice("/values/".length));
      } catch {
        return sendJson(response, 400, { error: "Malformed item name" });
      }
      if (!query) return sendJson(response, 404, { error: "Item not found" });

      const matches = findItems(dataset.items, query);
      if (matches.length === 0) return sendJson(response, 404, { error: "Item not found", query });
      if (matches.length > 1) {
        return sendJson(response, 409, {
          error: "Item name is ambiguous; use an id such as category:item-slug",
          query,
          matches: matches.map(({ id, name, category }) => ({ id, name, category })),
        });
      }
      return sendJson(
        response,
        200,
        { source: dataset.source, fetchedAt: dataset.fetchedAt, item: matches[0], cache: cache.state() },
        "public, max-age=60, stale-if-error=600",
      );
    }

    return sendJson(response, 404, { error: "Route not found" });
  });
}
