import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { defaultHook } from "stoker/openapi";
import { notFound, onError, serveEmojiFavicon } from "stoker/middlewares";

import { getAuth } from "core/auth/setup";

import { APIBindings, OpenAPI } from "@/types";
import { BASE_PATH } from "./constants";
import { getDatabase } from "core/database";
import { logger } from "hono/logger";

import { httpRequestCounter, httpRequestDurationHistogram, register } from "./metrics";

// Create a new OpenAPIHono instance with API Bindings
export function createAPIRouter(): OpenAPIHono<APIBindings> {
  return new OpenAPIHono<APIBindings>({
    strict: false,
    defaultHook
  });
}

// Setup API
export function setupAPI(): OpenAPIHono<APIBindings> {
  const api = createAPIRouter().basePath(BASE_PATH) as OpenAPI;

  // Prometheus Metrics Collection Middleware
  api.use("*", async (c, next) => {
    if (c.req.path.endsWith("/metrics")) {
      return next();
    }
    const start = performance.now();
    await next();
    const durationInSeconds = (performance.now() - start) / 1000;
    const route = c.req.matchedRoutes?.[0]?.path || c.req.path;
    const labels = {
      method: c.req.method,
      route,
      status_code: c.res.status.toString(),
    };
    httpRequestCounter.inc(labels);
    httpRequestDurationHistogram.observe(labels, durationInSeconds);
  });

  // Prometheus Endpoint
  api.get("/metrics", async (c) => {
    c.header("Content-Type", register.contentType);
    return c.text(await register.metrics());
  });

  // Logging Middleware
  api.use("*", logger());

  // CORS Middleware
  api.use(
    "*",
    cors({
      origin: (origin) => {
        const allowedOrigins = [
          "http://localhost:3000",
          "http://localhost:4000",
          process.env.FRONTEND_URL,
          process.env.CLIENT_URL
        ].filter(Boolean) as string[];

        if (!origin) return process.env.FRONTEND_URL || "https://traveny.com";

        if (allowedOrigins.includes(origin)) return origin;

        // Allow raw IP origins (e.g., http://13.126.125.245 or http://192.168.x.x)
        if (origin && /^http:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin)) {
          return origin;
        }

        if (origin?.endsWith('.vercel.app') && process.env.NODE_ENV !== 'production') {
          return origin;
        }

        return process.env.FRONTEND_URL || origin || "https://traveny.com";
      },
      allowHeaders: ["Content-Type", "Authorization", "Cookie", "X-Requested-With"],
      allowMethods: ["POST", "GET", "PUT", "DELETE", "PATCH", "OPTIONS"],
      exposeHeaders: ["Content-Length", "Set-Cookie"],
      maxAge: 600,
      credentials: true
    })
  );

  // Serve Favicon for fun
  api.use("*", serveEmojiFavicon("🍔"));

  // Inject Database into context
  api.use("*", async (c, next) => {
    const database = getDatabase();
    c.set("db", database);
    await next();
  });

  // Register BetterAuth Routing for API
  // Mount auth handler for all HTTP methods at /auth/* path
  api.all("/auth/*", async (c) => {
    const auth = getAuth();
    const pathname = new URL(c.req.url).pathname;
    const cookieHeader = c.req.header("cookie");
    
    console.log("[API Auth] Handling request:", {
      method: c.req.method,
      pathname,
      hasCookie: !!cookieHeader,
      cookiePreview: cookieHeader?.substring(0, 100)
    });
    
    const response = await auth.handler(c.req.raw);
    
    // Log response details for debugging
    const setCookieHeaders = response.headers.getSetCookie?.() || [];
    if (setCookieHeaders.length > 0) {
      console.log("[API Auth] Setting cookies:", {
        count: setCookieHeaders.length,
        cookies: setCookieHeaders.map(cookie => {
          const parts = cookie.split(';');
          return parts[0].substring(0, 50) + '...';
        })
      });
    }
    
    // For get-session requests, log the response body to see if session is null
    if (pathname.includes('/get-session')) {
      const clonedResponse = response.clone();
      const body = await clonedResponse.text();
      try {
        const data = JSON.parse(body);
        console.log("[API Auth] get-session response:", {
          hasSession: !!data?.session,
          hasUser: !!data?.user,
          userId: data?.user?.id,
          sessionPreview: data ? JSON.stringify(data).substring(0, 100) : 'null'
        });
      } catch (e) {
        console.log("[API Auth] get-session response: Could not parse JSON");
      }
    }
    
    return response;
  });

  // Error Handling Middleware with detailed validation error logging
  api.onError((err, c) => {
    console.error("[API Error]", {
      path: c.req.path,
      method: c.req.method,
      error: err.message,
      stack: err.stack,
      // Log validation error details if available
      cause: err.cause,
    });
    
    return onError(err, c);
  });

  // Not Found Middleware
  api.notFound(notFound);

  return api;
}
