# Stage 1: Prune
FROM node:22-alpine AS pruner
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN yarn global add turbo
COPY . .
# Extract only the 'web' app and its dependencies
RUN turbo prune web --docker

# Stage 2: Install dependencies
FROM node:22-alpine AS installer
RUN apk add --no-cache libc6-compat
WORKDIR /app

# First copy the pruned lockfile and package.json files
COPY .gitignore .gitignore
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/yarn.lock ./yarn.lock
RUN yarn install --frozen-lockfile

# Stage 3: Build
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY --from=installer /app/ .
COPY --from=pruner /app/out/full/ .
COPY turbo.json turbo.json

# Build the project
RUN yarn turbo run build --filter=web

# Stage 4: Runner
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the build artifacts
# Note: Path is apps/web because turbo prune preserves the structure
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/apps/web/server.js ./apps/web/server.js
COPY --from=builder /app/node_modules ./node_modules

USER nextjs

EXPOSE 80
ENV PORT 80

# Start the app from the specific workspace
WORKDIR /app/apps/web
CMD ["node", "server.js"]