FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps
COPY package.json yarn.lock turbo.json .yarnrc.yml ./
COPY packages/data-sync-server/package.json ./packages/data-sync-server/
COPY packages/data-sync-client/package.json ./packages/data-sync-client/
COPY packages/storage-adapters/package.json ./packages/storage-adapters/
COPY packages/examples/package.json ./packages/examples/

# Install dependencies
RUN corepack enable && yarn install --immutable

# Build the app
FROM deps AS builder
COPY . .
RUN yarn build

# Production image, copy all the files and run the server
FROM base AS runner
ENV NODE_ENV production

# Copy built packages
COPY --from=builder /app/packages/data-sync-server/dist ./packages/data-sync-server/dist
COPY --from=builder /app/packages/data-sync-client/dist ./packages/data-sync-client/dist
COPY --from=builder /app/packages/storage-adapters/dist ./packages/storage-adapters/dist
COPY --from=builder /app/packages/examples/dist ./packages/examples/dist

# Copy package.json files
COPY --from=builder /app/package.json /app/yarn.lock ./
COPY --from=builder /app/packages/data-sync-server/package.json ./packages/data-sync-server/
COPY --from=builder /app/packages/data-sync-client/package.json ./packages/data-sync-client/
COPY --from=builder /app/packages/storage-adapters/package.json ./packages/storage-adapters/
COPY --from=builder /app/packages/examples/package.json ./packages/examples/

# Install production dependencies only
RUN corepack enable && yarn install --production --immutable

# Expose the port the server runs on
EXPOSE 3000

# Create a non-root user to run the app
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs
USER nodejs

# Run the server
CMD ["node", "packages/examples/dist/server.js"]
