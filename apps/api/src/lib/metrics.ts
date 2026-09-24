import client from "prom-client";

// Collect default Node.js/Bun runtime metrics (CPU, Memory, Event Loop, GC)
client.collectDefaultMetrics({ prefix: "traveny_api_" });

// Custom HTTP Metrics
export const httpRequestCounter = new client.Counter({
  name: "traveny_api_http_requests_total",
  help: "Total number of HTTP requests processed",
  labelNames: ["method", "route", "status_code"],
});

export const httpRequestDurationHistogram = new client.Histogram({
  name: "traveny_api_http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

export const register = client.register;
