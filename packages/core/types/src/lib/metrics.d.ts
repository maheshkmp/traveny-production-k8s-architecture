import client from "prom-client";
export declare const httpRequestCounter: client.Counter<"method" | "route" | "status_code">;
export declare const httpRequestDurationHistogram: client.Histogram<"method" | "route" | "status_code">;
export declare const register: client.Registry<"text/plain; version=0.0.4; charset=utf-8">;
