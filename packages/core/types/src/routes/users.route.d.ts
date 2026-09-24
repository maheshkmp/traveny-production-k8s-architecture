declare const router: import("@hono/zod-openapi").OpenAPIHono<import("../types").APIBindings, {
    "/users": {
        $get: {
            input: {
                query: {
                    page?: unknown;
                    limit?: unknown;
                };
            };
            output: {
                users: {
                    id: string;
                    name: string;
                    email: string;
                    emailVerified: boolean;
                    image: string | null;
                    role: string | null;
                    banned: boolean | null;
                    banReason: string | null;
                    createdAt: string;
                    updatedAt: string;
                    plan?: "basic" | "pro" | "premium" | null | undefined;
                    subscriptionId?: string | null | undefined;
                    subscriptionStatus?: "active" | "cancelled" | "expired" | null | undefined;
                    subscriptionCurrentPeriodEnd?: string | null | undefined;
                    subscriptionActivatedAt?: string | null | undefined;
                    creditsRemaining?: number | null | undefined;
                    creditsUsed?: number | null | undefined;
                    creditsResetAt?: string | null | undefined;
                }[];
                total: number;
                page: number;
                limit: number;
            };
            outputFormat: "json";
            status: 200;
        } | {
            input: {
                query: {
                    page?: unknown;
                    limit?: unknown;
                };
            };
            output: {
                message: string;
            };
            outputFormat: "json";
            status: 401;
        } | {
            input: {
                query: {
                    page?: unknown;
                    limit?: unknown;
                };
            };
            output: {
                message: string;
            };
            outputFormat: "json";
            status: 403;
        };
    };
} & {
    "/users/:id": {
        $get: {
            input: {
                param: {
                    id: string;
                };
            };
            output: {
                id: string;
                name: string;
                email: string;
                emailVerified: boolean;
                image: string | null;
                role: string | null;
                banned: boolean | null;
                banReason: string | null;
                createdAt: string;
                updatedAt: string;
                plan?: "basic" | "pro" | "premium" | null | undefined;
                subscriptionId?: string | null | undefined;
                subscriptionStatus?: "active" | "cancelled" | "expired" | null | undefined;
                subscriptionCurrentPeriodEnd?: string | null | undefined;
                subscriptionActivatedAt?: string | null | undefined;
                creditsRemaining?: number | null | undefined;
                creditsUsed?: number | null | undefined;
                creditsResetAt?: string | null | undefined;
            };
            outputFormat: "json";
            status: 200;
        } | {
            input: {
                param: {
                    id: string;
                };
            };
            output: {
                message: string;
            };
            outputFormat: "json";
            status: 401;
        } | {
            input: {
                param: {
                    id: string;
                };
            };
            output: {
                message: string;
            };
            outputFormat: "json";
            status: 403;
        } | {
            input: {
                param: {
                    id: string;
                };
            };
            output: {
                message: string;
            };
            outputFormat: "json";
            status: 404;
        };
    };
} & {
    "/users/:id": {
        $patch: {
            input: {
                param: {
                    id: string;
                };
            } & {
                json: {
                    name?: string | undefined;
                    role?: "admin" | "user" | "agent" | undefined;
                    banned?: boolean | undefined;
                    banReason?: string | undefined;
                };
            };
            output: {
                id: string;
                name: string;
                email: string;
                emailVerified: boolean;
                image: string | null;
                role: string | null;
                banned: boolean | null;
                banReason: string | null;
                createdAt: string;
                updatedAt: string;
                plan?: "basic" | "pro" | "premium" | null | undefined;
                subscriptionId?: string | null | undefined;
                subscriptionStatus?: "active" | "cancelled" | "expired" | null | undefined;
                subscriptionCurrentPeriodEnd?: string | null | undefined;
                subscriptionActivatedAt?: string | null | undefined;
                creditsRemaining?: number | null | undefined;
                creditsUsed?: number | null | undefined;
                creditsResetAt?: string | null | undefined;
            };
            outputFormat: "json";
            status: 200;
        } | {
            input: {
                param: {
                    id: string;
                };
            } & {
                json: {
                    name?: string | undefined;
                    role?: "admin" | "user" | "agent" | undefined;
                    banned?: boolean | undefined;
                    banReason?: string | undefined;
                };
            };
            output: {
                message: string;
            };
            outputFormat: "json";
            status: 404;
        } | {
            input: {
                param: {
                    id: string;
                };
            } & {
                json: {
                    name?: string | undefined;
                    role?: "admin" | "user" | "agent" | undefined;
                    banned?: boolean | undefined;
                    banReason?: string | undefined;
                };
            };
            output: {
                message: string;
            };
            outputFormat: "json";
            status: 400;
        } | {
            input: {
                param: {
                    id: string;
                };
            } & {
                json: {
                    name?: string | undefined;
                    role?: "admin" | "user" | "agent" | undefined;
                    banned?: boolean | undefined;
                    banReason?: string | undefined;
                };
            };
            output: {
                message: string;
            };
            outputFormat: "json";
            status: 401;
        } | {
            input: {
                param: {
                    id: string;
                };
            } & {
                json: {
                    name?: string | undefined;
                    role?: "admin" | "user" | "agent" | undefined;
                    banned?: boolean | undefined;
                    banReason?: string | undefined;
                };
            };
            output: {
                message: string;
            };
            outputFormat: "json";
            status: 403;
        };
    };
} & {
    "/users/:id": {
        $delete: {
            input: {
                param: {
                    id: string;
                };
            };
            output: {
                message: string;
            };
            outputFormat: "json";
            status: 404;
        } | {
            input: {
                param: {
                    id: string;
                };
            };
            output: {
                message: string;
            };
            outputFormat: "json";
            status: 200;
        } | {
            input: {
                param: {
                    id: string;
                };
            };
            output: {
                message: string;
            };
            outputFormat: "json";
            status: 400;
        } | {
            input: {
                param: {
                    id: string;
                };
            };
            output: {
                message: string;
            };
            outputFormat: "json";
            status: 401;
        } | {
            input: {
                param: {
                    id: string;
                };
            };
            output: {
                message: string;
            };
            outputFormat: "json";
            status: 403;
        };
    };
}, "/">;
export default router;
