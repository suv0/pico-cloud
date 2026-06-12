# ── Stage 1: deps ────────────────────────────────────────────────────────────
# Install production dependencies only.
# This layer is cached and reused unless package.json changes.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ── Stage 2: builder ──────────────────────────────────────────────────────────
# Install ALL dependencies (including dev tools), generate Prisma client,
# and produce the optimised Next.js build artefact.
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
# Build-time secret for Next.js page-data collection; runtime uses compose env.
ENV SESSION_SECRET=docker-build-secret-32-chars-minimum-ok
RUN npm run build

# ── Stage 3: runner ───────────────────────────────────────────────────────────
# Lean production image.
# - Production node_modules from deps  (~250 MB vs ~700 MB single-stage)
# - Prisma generated client from builder (generated code lives in .prisma/)
# - Next.js build output from builder
# - Static assets, migrations, seed
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Production dependencies (prisma CLI + @prisma/client included because
# we moved them to "dependencies" in package.json)
COPY --from=deps /app/node_modules ./node_modules

# Prisma-generated TypeScript client — produced by "prisma generate" in builder,
# not present in deps stage (deps only runs npm install, not prisma generate)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Next.js build output
COPY --from=builder /app/.next ./.next

# Static public assets (directory always exists — see public/.gitkeep)
COPY --from=builder /app/public ./public

# DB migration files, seed script, package.json (needed by prisma CLI at runtime)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/package.json ./package.json

EXPOSE 3080

# Startup sequence: apply migrations → recover stuck provisions → seed → start server (PORT set by docker-compose)
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node_modules/.bin/tsx scripts/startup-recovery.ts && node_modules/.bin/prisma db seed && node_modules/.bin/next start"]
