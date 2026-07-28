FROM node:22-alpine

ENV NODE_ENV=production

WORKDIR /app

# Reproducible, lockfile-pinned prod install (npm ci fails fast if the lock is
# out of sync) for a tiny, deterministic final image.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY server.js ./

USER node
EXPOSE 8006

HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -q --spider http://localhost:8006/healthz || exit 1

CMD ["node", "server.js"]
