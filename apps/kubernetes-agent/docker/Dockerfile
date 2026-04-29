FROM node:22-slim AS builder
WORKDIR /app

RUN yarn global add turbo

COPY . .

RUN turbo prune --scope=kubernetes-agent --docker

FROM node:22-slim AS installer
WORKDIR /app

COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/yarn.lock ./yarn.lock

RUN yarn install

# Build the project
COPY --from=builder /app/out/full/ .
COPY turbo.json turbo.json
RUN yarn turbo run build --filter=kubernetes-agent...

FROM node:22-slim AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nestjs
RUN adduser --system --uid 1001 nestjs
USER nestjs

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

COPY --from=installer --chown=nestjs:nestjs /app .

CMD ["node", "apps/kubernetes-agent/dist/main.js"]
