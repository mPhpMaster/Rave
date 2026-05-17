# Build stage
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Workspace plumbing
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/server/package.json ./apps/server/package.json

RUN pnpm install --filter @rave/server --frozen-lockfile

COPY apps/server ./apps/server
RUN pnpm --filter @rave/server build

# Runtime stage
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Copy only what's needed at runtime.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/package.json ./apps/server/package.json

EXPOSE 3001
WORKDIR /app/apps/server
CMD ["node", "dist/index.js"]
