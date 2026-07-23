# Manual ISPMAX

Documentación de usuario de ISPMAX, construida con [Rspress 2](https://rspress.rs).

## Requisitos

Node.js **20.19+ o 22.12+** (hay un `.nvmrc` con `22`).

```bash
nvm use
```

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm install` | Instala dependencias. |
| `npm run dev` | Servidor de desarrollo con recarga en caliente en http://localhost:3000. |
| `npm run build` | Genera el sitio estático en `dist/`. |
| `npm run preview` | Sirve `dist/` para revisarlo como en producción. |
| `npm run assets` | Copia `assets/` → `docs/public/assets/` (lo ejecutan `dev` y `build`). |
| `npm run migrate:html` | Regenera las páginas MDX a partir de `index.html`. |
| `node scripts/verify-content.mjs` | Comprueba que el sitio construido conserva todo el contenido del HTML original. |

## Estructura

```
docs/
  index.mdx            Portada (pageType: home)
  guia/*.mdx           45 páginas, una por sección del manual original
  sidebar.json         Menú lateral (generado por la migración)
  public/assets/       Copia de assets/ (generada, ignorada por git)
src/components/        Componentes MDX propios (Figure, Cards, Steps, …)
styles/index.css       Capa de marca sobre el tema de Rspress
rspress.config.ts      Configuración del sitio
scripts/               Migración, sincronía de assets y verificación
assets/                Fuente única de imágenes y logo (versionada)
index.html             Manual HTML original — se conserva, no se toca
manual.css manual.js   Estilos y scripts del manual original
```

## Rutas

Cada sección conserva su identificador: el ancla `#routers` del manual antiguo
es ahora `/guia/routers`. El componente `LegacyHashRedirect` redirige
automáticamente cualquier enlace guardado con el formato antiguo
(`/#facturas` → `/guia/facturas`).

La versión HTML original queda publicada en `/legacy/` dentro de la imagen
Docker.

## Actualizar el contenido

El contenido vive ahora en los `.mdx` de `docs/guia/`: edítalos directamente.

`npm run migrate:html` sólo se usa si quieres volver a generar todo desde
`index.html`; **sobrescribe** `docs/guia/`, así que no lo ejecutes si ya has
editado los MDX a mano.

## Despliegue

```bash
docker build -t ispmax-manual:latest .
```

```bash
docker run -d --name ispmax-manual --restart unless-stopped -p 8387:8387 ispmax-manual:latest
```

El `Dockerfile` es multietapa: compila con Node 22 y sirve el resultado con
Nginx en el puerto 8387.

Para un hosting estático cualquiera, basta con publicar el contenido de `dist/`.
