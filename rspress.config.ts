import { readFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from '@rspress/core';
import type { Sidebar } from '@rspress/core';

const here = (...p: string[]) => path.join(__dirname, ...p);
const component = (name: string) => here('src', 'components', `${name}.tsx`);

/* El sidebar se genera desde `scripts/html-to-mdx.mjs`, que a su vez lo deriva
   del `<nav id="sidebar">` original: mismo orden, mismos grupos, mismos textos. */
type RawSidebar = { sectionHeader: string; items: { text: string; link: string; tag?: string }[] }[];
const rawSidebar: RawSidebar = JSON.parse(readFileSync(here('docs', 'sidebar.json'), 'utf8'));

const sidebar: Sidebar = {
  '/guia/': rawSidebar.flatMap(group => [
    { sectionHeaderText: group.sectionHeader },
    ...group.items,
  ]),
};

const WHATSAPP = 'https://wa.me/593991031784';

const svg = {
  whatsapp:
    '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>',
  tiktok:
    '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.51a8.31 8.31 0 0 0 4.83 1.55V6.69h-1.9z"/></svg>',
};

/** Textos de interfaz en español (Rspress solo trae `en` y `zh` de serie). */
const es = (value: string) => ({ en: value, zh: value, es: value });

export default defineConfig({
  root: 'docs',
  outDir: 'dist',
  lang: 'es',

  title: 'Manual ISPMAX',
  description:
    'Manual de usuario de ISPMAX: guía práctica para administradores, operadores y técnicos de la plataforma de gestión de ISP.',

  logo: '/assets/logo/ISPMAX.png',
  logoText: 'Manual ISPMAX',
  icon: '/assets/logo/ISPMAX.png',

  head: [
    ['meta', { name: 'author', content: 'InigualitySoft' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'Manual ISPMAX' }],
    ['meta', { property: 'og:locale', content: 'es_ES' }],
    ['meta', { name: 'twitter:card', content: 'summary' }],
    ['meta', { name: 'theme-color', content: '#0d1117', media: '(prefers-color-scheme: dark)' }],
    ['meta', { name: 'theme-color', content: '#f4f6fb', media: '(prefers-color-scheme: light)' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    [
      'link',
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
      },
    ],
  ],

  globalStyles: here('styles', 'index.css'),
  globalUIComponents: [component('LegacyHashRedirect')],

  markdown: {
    globalComponents: [
      component('Figure'),
      component('Cards'),
      component('Card'),
      component('Steps'),
      component('Step'),
      component('Kicker'),
      component('Lead'),
      component('FigRow'),
      component('FigGrid'),
      component('Badge'),
      component('Callout'),
      component('SearchTerms'),
    ],
  },

  // Zoom de imágenes: sustituye al lightbox artesanal del manual antiguo.
  mediumZoom: {
    selector: '.rspress-doc img',
    options: { margin: 24 },
  },

  search: {
    mode: 'local',
    codeBlocks: false,
  },

  i18nSource: {
    outlineTitle: es('En esta página'),
    prevPageText: es('Anterior'),
    nextPageText: es('Siguiente'),
    searchPlaceholderText: es('Buscar módulo, opción o función…'),
    searchNoResultsText: es('Sin resultados para'),
    searchSuggestedQueryText: es('Prueba con otra búsqueda, por ejemplo router, factura, pago o cliente.'),
    searchPanelCancelText: es('Cancelar'),
    themeText: es('Tema'),
    menuTitle: es('Menú'),
    languagesText: es('Idiomas'),
    versionsText: es('Versiones'),
    lastUpdatedAuthorText: es('Última edición por'),
    sourceCodeText: es('Código fuente'),
    openInText: es('Abrir en'),
    editLinkText: es('Editar esta página'),
    copyMarkdownText: es('Copiar como Markdown'),
    copyMarkdownLinkText: es('Copiar enlace en Markdown'),
    promptCopyText: es('Copiar'),
    promptCopiedText: es('Copiado'),
    promptExpandText: es('Desplegar'),
    promptCollapseText: es('Plegar'),
    scrollToTopText: es('Volver arriba'),
    lastUpdatedText: es('Última actualización'),
    notFoundText: es('No encontramos esta página del manual.'),
    takeMeHomeText: es('Ir al inicio'),
    codeButtonGroupCopyButtonText: es('Copiar'),
    codeButtonGroupWrapButtonText: es('Ajustar líneas'),
    'overview.filterNameText': es('Filtrar'),
    'overview.filterPlaceholderText': es('Escribe una palabra'),
    'overview.filterNoResultText': es('Sin coincidencias'),
  },

  themeConfig: {
    darkMode: true,
    enableScrollToTop: true,
    enableAppearanceAnimation: true,
    sidebar,

    nav: [
      { text: 'Guía', link: '/guia/inicio', activeMatch: '^/guia/(?!rutinas|faq|glosario)' },
      {
        text: 'Referencia',
        items: [
          { text: '✅ Rutinas diarias', link: '/guia/rutinas' },
          { text: '❓ Preguntas frecuentes', link: '/guia/faq' },
          { text: '📖 Glosario', link: '/guia/glosario' },
        ],
      },
      { text: 'Soporte', link: WHATSAPP },
    ],

    socialLinks: [
      { icon: { svg: svg.whatsapp }, mode: 'link', content: WHATSAPP },
      { icon: 'instagram', mode: 'link', content: 'https://www.instagram.com/rednuevaconexion.ec/?hl=es' },
      { icon: { svg: svg.tiktok }, mode: 'link', content: 'https://www.tiktok.com/@iniguality' },
    ],

    footer: {
      message: [
        '<div class="isp-footer">',
        '  <div class="isp-footer__brand">ISPMAX · Manual de usuario</div>',
        '  <p class="isp-footer__desc">Documento de referencia para administradores, operadores y técnicos de la plataforma ISPMAX.</p>',
        '  <div class="isp-footer__contact">',
        '    <a href="tel:+593991031784">📞 +593 99 103 1784</a>',
        '    <a href="mailto:info@inigualitysoft.com">✉️ info@inigualitysoft.com</a>',
        `    <a href="${WHATSAPP}" rel="noopener" target="_blank">💬 Soporte WhatsApp</a>`,
        '  </div>',
        '  <p class="isp-footer__copy">© 2026 InigualitySoft</p>',
        '</div>',
      ].join(''),
    },
  },

  builderConfig: {
    html: { title: 'Manual ISPMAX' },
  },
});
