FROM node:22-alpine

WORKDIR /app

# Copy root and package descriptors
COPY package.json ./
COPY backend/package.json ./backend/
COPY web/package.json ./web/

# Install dependencies
RUN npm --prefix backend install && npm --prefix web install

# Copy full application sources
COPY backend ./backend
COPY web ./web
COPY server.js ./

# Build TypeScript backend and Next.js frontend
RUN npm run build

# Expose unified server port
EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

VOLUME ["/app/data"]
ENV DATABASE_PATH=/app/data/evidence_graph.db

CMD ["node", "server.js"]
