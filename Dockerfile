# ---- Builder: install production deps (compiles better-sqlite3 if needed) ----
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# Toolchain insurance: better-sqlite3 normally fetches a prebuilt binary, but
# these let it compile from source if a prebuilt one isn't available.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

# ---- Runtime: lean image with just Node + the app ---------------------------
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# SQLite database lives here. Mount a persistent volume at /data to keep the
# salad history across restarts and redeploys.
ENV DB_PATH=/data/salads.db
RUN mkdir -p /data && chown -R node:node /data

COPY --from=builder /app /app

USER node
EXPOSE 3000
CMD ["node", "server.js"]
