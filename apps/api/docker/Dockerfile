FROM node:22-slim AS pruner
WORKDIR /app

RUN yarn global add turbo

COPY . .

RUN turbo prune --scope=api --docker

FROM node:22-slim AS deps
WORKDIR /app

COPY .gitignore .gitignore
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/yarn.lock ./yarn.lock

RUN yarn install --frozen-lockfile

FROM node:22-slim AS builder
WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/package.json /app/package.json

# Copy the full pruned workspace
COPY --from=pruner /app/out/full/ .
COPY turbo.json turbo.json

# Build the project
RUN yarn turbo run build --filter=api...

# Compile migration files separately (Vite only bundles the app entry point)
RUN npx tsc -p apps/api/tsconfig.migrations.json

FROM node:22-slim AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nestjs && \
    adduser --system --uid 1001 nestjs

# Copy only what's needed to run
COPY --from=deps --chown=nestjs:nestjs /app/node_modules /app/node_modules
COPY --from=deps --chown=nestjs:nestjs /app/package.json /app/package.json
COPY --from=builder --chown=nestjs:nestjs /app/apps/api/dist /app/apps/api/dist
COPY --from=builder --chown=nestjs:nestjs /app/apps/api/package.json /app/apps/api/package.json

USER nestjs

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "apps/api/dist/main"]