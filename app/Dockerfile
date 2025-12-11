FROM oven/bun:slim AS base
WORKDIR /app

FROM base AS development
ENV NODE_ENV=development
COPY package.json bun.lock ./
RUN bun install
COPY . ./
EXPOSE 4173
CMD ["bun", "run", "dev"]

