FROM oven/bun:slim AS base
WORKDIR /app

FROM base AS development
ENV NODE_ENV=development
COPY package.json bun.lock ./
RUN bun install
EXPOSE 5173
CMD ["bun", "run", "dev"]

FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM base AS production
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
EXPOSE 4173
CMD ["bun", "run", "preview", "--host", "0.0.0.0", "--port", "4173"]

