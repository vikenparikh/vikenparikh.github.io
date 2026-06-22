FROM node:22-alpine

WORKDIR /app

# Install only prod deps for a tiny final image.
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

COPY server.js ./

USER node
EXPOSE 8006

HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -q --spider http://localhost:8006/healthz || exit 1

CMD ["node", "server.js"]
