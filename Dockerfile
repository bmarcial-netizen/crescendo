FROM node:20-alpine

WORKDIR /app

# Install deps first (layer cache)
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy source
COPY tsconfig.json drizzle.config.ts ./
COPY src/ src/

ENV NODE_ENV=production
EXPOSE 3000

# Health check against the /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["npx", "tsx", "src/index.ts"]
