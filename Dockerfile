# PARMSUKH – Next.js + Prisma (SQLite). Database and uploads live in the /data volume.
FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 DATABASE_URL=file:/tmp/build.db
RUN ./node_modules/.bin/prisma generate && npm run build

FROM node:22-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /data/storage && chown -R node:node /data
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL=file:/data/parmsukh.db STORAGE_DIR=/data/storage DEV_SHOW_OTP=false
COPY --from=build --chown=node:node /app /app
RUN chmod +x docker-entrypoint.sh
USER node
EXPOSE 3000
CMD ["./docker-entrypoint.sh"]
