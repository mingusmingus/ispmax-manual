# ─────────────────────────────────────────────────────────────
# ISPMAX · Manual de Usuario — Imagen de producción
#
# Etapa 1: construye la documentación con Rspress 2.
# Etapa 2: la sirve con Nginx Alpine.
#
# La versión HTML original se conserva y queda publicada en /legacy/.
#
# Build:  docker build -t ispmax-manual:latest .
# Run:    docker run -d --name ispmax-manual --restart unless-stopped -p 8387:8387 ispmax-manual:latest
# ─────────────────────────────────────────────────────────────

# ── Etapa 1 · build ──────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

# Dependencias primero para aprovechar la caché de capas.
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# Fuentes del manual.
COPY rspress.config.ts tsconfig.json ./
COPY scripts ./scripts
COPY src ./src
COPY styles ./styles
COPY docs ./docs
COPY assets ./assets
COPY index.html manual.css manual.js ./

# `npm run build` sincroniza assets → docs/public y genera dist/.
RUN npm run build


# ── Etapa 2 · runtime ────────────────────────────────────────
FROM nginx:1.27-alpine

LABEL org.opencontainers.image.title="ISPMAX Manual"
LABEL org.opencontainers.image.description="Manual de usuario de ISPMAX (Rspress 2)"
LABEL org.opencontainers.image.vendor="InigualitySoft"

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

WORKDIR /usr/share/nginx/html

# Sitio nuevo en la raíz.
COPY --from=build /app/dist/ ./

# Manual HTML original accesible en /legacy/ (sus imágenes se resuelven
# mediante un `alias` de Nginx hacia /assets, así no se duplican).
COPY index.html manual.css manual.js ./legacy/

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8387/ || exit 1

EXPOSE 8387
