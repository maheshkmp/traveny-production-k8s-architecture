declare const router: import("hono/hono-base").HonoBase<import("../types").APIBindings, {
    "/metrics": {
        $get: {
            input: {};
            output: string;
            outputFormat: "text";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
}, "/">;
export default router;
