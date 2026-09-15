# Stage 1: builder
FROM oven/bun:1 AS builder
WORKDIR /app

COPY package.json bun.lock* ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
COPY packages/core/package.json ./packages/core/

RUN bun install --frozen-lockfile --backend=copyfile --network-concurrency=8


ENV NODE_ENV=production

COPY . .

# Build core first
RUN cd packages/core && bun run build

# Bundle API into single file
RUN bun build apps/api/server.ts \
  --outfile dist/server.js \
  --target bun \
  --minify \
  --external pg \
  --external @neondatabase/serverless \
  --external ws

# Bundle Database Migrator into single file
RUN bun build packages/core/src/database/migrate.ts \
  --outfile dist/migrate.js \
  --target bun \
  --minify \
  --external pg \
  --external @neondatabase/serverless \
  --external ws

# Stage 3: runner
FROM oven/bun:1-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

COPY --from=builder /app/dist/server.js ./server.js
COPY --from=builder /app/dist/migrate.js ./migrate.js
COPY --from=builder /app/packages/core/src/database/migrations ./src/database/migrations

# Install external dependencies so all transitive deps (like pg-types, postgres-bytea) are included correctly
RUN bun add pg @neondatabase/serverless ws

EXPOSE 4000
CMD ["bun", "server.js"]