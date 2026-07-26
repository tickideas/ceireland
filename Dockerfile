# syntax=docker/dockerfile:1

FROM node:22-alpine AS base

# Pin npm to avoid build notices and ensure consistent behavior
RUN npm install -g npm@11.8.0

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN npm ci --ignore-scripts

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

# NEXT_PUBLIC_* is inlined into the client bundle at build time, so this must
# be a build argument. Supplying it only as a runtime environment variable
# leaves the widget without a site key: it renders nothing, no token is sent,
# and the server - which does read TURNSTILE_SECRET_KEY at runtime - then
# rejects every registration.
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY

# Clear any potential stale cache
RUN rm -rf .next

RUN npx prisma generate --no-hints
RUN npm run build

# Bundle maintenance scripts into self-contained CJS so they can run in the
# runner stage, which has neither tsx nor the src/ tree. Compiling from the
# real source means shared rules (e.g. isNameSafe) are inlined from the single
# definition and cannot drift from what the API enforces.
# @prisma/client stays external: it resolves its generated engine at runtime.
RUN npx esbuild scripts/*.ts \
      --bundle \
      --platform=node \
      --target=node22 \
      --format=cjs \
      --external:@prisma/client \
      --outdir=scripts-dist \
      --out-extension:.js=.cjs

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Create cache directory writable by nextjs user
RUN mkdir -p .next/cache && chown -R nextjs:nodejs .next/cache
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder --chown=nextjs:nodejs /app/scripts-dist ./scripts-dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Install prisma CLI with all transitive deps for runtime migrations.
# Note: effect is a transitive dep of @prisma/config and must be listed
# explicitly because @prisma/config is already copied from the builder stage,
# so npm does not re-resolve its sub-dependencies.
#
# The CLI version MUST stay pinned to the @prisma/client version in
# package-lock.json. This install bypasses the lockfile, so leaving it
# unpinned means each rebuild silently picks up whatever is on the registry -
# start.sh runs `migrate deploy` with it against production on every boot, and
# a major-version jump would stop the container from starting.
RUN npm install --no-save --no-package-lock prisma@6.19.3 dotenv effect

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy and use startup script that runs migrations before starting
COPY --chown=nextjs:nodejs start.sh ./
RUN chmod +x start.sh

CMD ["./start.sh"]
