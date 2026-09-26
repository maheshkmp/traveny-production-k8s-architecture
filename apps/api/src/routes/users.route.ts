import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { z } from "zod";
import { eq, desc, count } from "drizzle-orm";

import { createAPIRouter } from "@/lib/setup-api";
import { authMiddleware } from "@/middlewares/auth.middleware";
import { adminMiddleware } from "@/middlewares/admin.middleware";
import { notFoundSchema } from "@/lib/constants";
import { users } from "core/database/schema";

// ── Zod Schemas ─────────────────────────────────────────────────────────────

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  role: z.string().nullable(),
  banned: z.boolean().nullable(),
  banReason: z.string().nullable(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
  plan: z.enum(["basic", "pro", "premium"]).nullable().optional(),
  subscriptionId: z.string().nullable().optional(),
  subscriptionStatus: z.enum(["active", "cancelled", "expired"]).nullable().optional(),
  subscriptionCurrentPeriodEnd: z.string().or(z.date()).nullable().optional(),
  subscriptionActivatedAt: z.string().or(z.date()).nullable().optional(),
  creditsRemaining: z.number().nullable().optional(),
  creditsUsed: z.number().nullable().optional(),
  creditsResetAt: z.string().or(z.date()).nullable().optional(),
});

const UpdateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["admin", "agent", "user"]).optional(),
  banned: z.boolean().optional(),
  banReason: z.string().optional(),
});

const UsersListSchema = z.object({
  users: z.array(UserSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

const protectedMiddleware = [authMiddleware, adminMiddleware];

const listUsersRoute = createRoute({
  tags: ["Users"],
  method: "get",
  path: "/users",
  middleware: protectedMiddleware,
  request: {
    query: z.object({
      page: z.coerce.number().min(1).default(1).optional(),
      limit: z.coerce.number().min(1).max(100).default(20).optional(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(UsersListSchema, "List of all users"),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(z.object({ message: z.string() }), "Not authenticated"),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(z.object({ message: z.string() }), "Admin access required"),
  },
});

const getUserRoute = createRoute({
  tags: ["Users"],
  method: "get",
  path: "/users/:id",
  middleware: protectedMiddleware,
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(UserSchema, "User details"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "User not found"),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(z.object({ message: z.string() }), "Not authenticated"),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(z.object({ message: z.string() }), "Admin access required"),
  },
});

const updateUserRoute = createRoute({
  tags: ["Users"],
  method: "patch",
  path: "/users/:id",
  middleware: protectedMiddleware,
  request: {
    params: z.object({ id: z.string() }),
    body: jsonContentRequired(UpdateUserSchema, "Fields to update"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(UserSchema, "Updated user"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "User not found"),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(z.object({ message: z.string() }), "Validation error"),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(z.object({ message: z.string() }), "Not authenticated"),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(z.object({ message: z.string() }), "Admin access required"),
  },
});

const deleteUserRoute = createRoute({
  tags: ["Users"],
  method: "delete",
  path: "/users/:id",
  middleware: protectedMiddleware,
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(z.object({ message: z.string() }), "User deleted"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "User not found"),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(z.object({ message: z.string() }), "Cannot delete self or validation error"),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(z.object({ message: z.string() }), "Not authenticated"),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(z.object({ message: z.string() }), "Admin access required"),
  },
});

const router = createAPIRouter()
  .openapi(listUsersRoute, async (c) => {
    const db = c.get("db");
    const { page = 1, limit = 20 } = c.req.valid("query");
    const offset = (page - 1) * limit;

    const [rows, [{ value: total }]] = await Promise.all([
      db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          emailVerified: users.emailVerified,
          image: users.image,
          role: users.role,
          banned: users.banned,
          banReason: users.banReason,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          plan: users.plan,
          subscriptionId: users.subscriptionId,
          subscriptionStatus: users.subscriptionStatus,
          subscriptionCurrentPeriodEnd: users.subscriptionCurrentPeriodEnd,
          subscriptionActivatedAt: users.subscriptionActivatedAt,
          creditsRemaining: users.creditsRemaining,
          creditsUsed: users.creditsUsed,
          creditsResetAt: users.creditsResetAt,
        })
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ value: count() }).from(users),
    ]);

    return c.json({ users: rows, total, page, limit }, HttpStatusCodes.OK);
  })
  .openapi(getUserRoute, async (c) => {
    const db = c.get("db");
    const { id } = c.req.valid("param");

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      return c.json({ message: "Not Found" }, HttpStatusCodes.NOT_FOUND);
    }

    return c.json(user, HttpStatusCodes.OK);
  })
  .openapi(updateUserRoute, async (c) => {
    const db = c.get("db");
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!existing.length) {
      return c.json({ message: "Not Found" }, HttpStatusCodes.NOT_FOUND);
    }

    const [updated] = await db
      .update(users)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    return c.json(updated, HttpStatusCodes.OK);
  })
  .openapi(deleteUserRoute, async (c) => {
    const db = c.get("db");
    const { id } = c.req.valid("param");

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!existing.length) {
      return c.json({ message: "Not Found" }, HttpStatusCodes.NOT_FOUND);
    }

    const currentUser = c.get("user");
    if (currentUser?.id === id) {
      return c.json({ message: "Cannot delete your own account" }, HttpStatusCodes.BAD_REQUEST);
    }

    await db.delete(users).where(eq(users.id, id));

    return c.json({ message: "User deleted successfully" }, HttpStatusCodes.OK);
  });

export default router;
