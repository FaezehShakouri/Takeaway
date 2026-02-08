# ---- Stage 1: Install dependencies & build frontend ----
FROM node:20-slim AS builder

# Install Bun
RUN apt-get update && apt-get install -y curl unzip && \
    curl -fsSL https://bun.sh/install | bash && \
    ln -s /root/.bun/bin/bun /usr/local/bin/bun && \
    ln -s /root/.bun/bin/bunx /usr/local/bin/bunx

WORKDIR /app

# -- Frontend: install deps & build --
COPY apps/web/frontend/package.json apps/web/frontend/bun.lockb apps/web/frontend/
RUN cd apps/web/frontend && bun install --frozen-lockfile

COPY apps/web/frontend/ apps/web/frontend/
RUN cd apps/web/frontend && bun run build

# -- Relayer: install deps --
COPY apps/relayer/package.json apps/relayer/bun.lockb apps/relayer/
RUN cd apps/relayer && bun install --frozen-lockfile

COPY apps/relayer/ apps/relayer/

# ---- Stage 2: Production image ----
FROM node:20-slim AS runner

# Install Bun (needed for the relayer)
RUN apt-get update && apt-get install -y curl unzip && \
    curl -fsSL https://bun.sh/install | bash && \
    ln -s /root/.bun/bin/bun /usr/local/bin/bun && \
    ln -s /root/.bun/bin/bunx /usr/local/bin/bunx && \
    apt-get purge -y curl unzip && apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# --- Frontend (Next.js standalone) ---
# The standalone output contains server.js + minimal node_modules
COPY --from=builder /app/apps/web/frontend/.next/standalone/ ./
# Static assets & public files must be copied separately
COPY --from=builder /app/apps/web/frontend/.next/static apps/web/frontend/.next/static
COPY --from=builder /app/apps/web/frontend/public apps/web/frontend/public

# --- Relayer ---
COPY --from=builder /app/apps/relayer/ apps/relayer/
COPY --from=builder /app/apps/relayer/node_modules apps/relayer/node_modules

# Copy start script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Render provides PORT env var (defaults to 3000)
ENV PORT=3000
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

CMD ["/app/start.sh"]
