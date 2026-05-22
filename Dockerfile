# ─────────────────────────────────────────────────────────────
# ISPMAX · Manual de Usuario — Imagen de producción
#
# Sirve el manual estático con Nginx Alpine (imagen ≈ 50 MB).
# Asume reverse proxy delante (Cloudflare / Traefik / Nginx host)
# que termina HTTPS. Este contenedor solo atiende HTTP en :80.
#
# Build:  docker build -t ispmax-manual:latest .
# Run:    docker run -d --name ispmax-manual -p 8080:80 ispmax-manual:latest
# ─────────────────────────────────────────────────────────────

FROM nginx:1.27-alpine

# Metadata (visible con `docker inspect`)
LABEL org.opencontainers.image.title="ISPMAX Manual"
LABEL org.opencontainers.image.description="Manual de usuario de ISPMAX (sitio estático)"
LABEL org.opencontainers.image.vendor="InigualitySoft"

# Quitamos la config por defecto y ponemos la nuestra
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar archivos del manual a la raíz web de Nginx.
# El .dockerignore garantiza que no entren basura, .git, backend, etc.
WORKDIR /usr/share/nginx/html
COPY index.html manual.css manual.js ./
COPY assets ./assets

# Healthcheck: si Nginx muere, el orquestador lo reinicia
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

EXPOSE 80

# Nginx ya viene como CMD en la imagen base; no hace falta sobreescribir.
