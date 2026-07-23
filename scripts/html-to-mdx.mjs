/**
 * Migración `index.html` → páginas MDX de Rspress.
 *
 * El HTML original está anidado de forma irregular (varias `<section>` quedan
 * sin cerrar), así que troceamos a nivel de texto por cada etiqueta de apertura
 * `<section class="doc-section">` — que es exactamente el orden en el que el
 * navegador pinta el contenido — y después parseamos cada trozo por separado.
 *
 * El script es idempotente: se puede volver a ejecutar tras editar el HTML.
 *
 *   node scripts/html-to-mdx.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'node-html-parser';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HTML = path.join(root, 'index.html');
const OUT_DIR = path.join(root, 'docs', 'guia');
const IMG_DIR = path.join(root, 'assets', 'imgs');

/* ── Dimensiones reales de cada imagen ──────────────────────────────────────
   Lee el ancho/alto sin dependencias, directamente de la cabecera del PNG o
   WEBP. Se usa para que ninguna figura se muestre más grande que el archivo
   original (el HTML antiguo tenía `max-width` mayores que la propia imagen y
   por eso algunas capturas salían ampliadas y borrosas).                     */
function imageSize(file) {
  const b = readFileSync(file);
  if (b[0] === 0x89 && b[1] === 0x50) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; // PNG
  if (b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP') {
    const fmt = b.slice(12, 16).toString();
    if (fmt === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
    if (fmt === 'VP8L') {
      const n = b.readUInt32LE(21);
      return { w: (n & 0x3fff) + 1, h: ((n >> 14) & 0x3fff) + 1 };
    }
    if (fmt === 'VP8X') {
      return {
        w: ((b[24] | (b[25] << 8) | (b[26] << 16)) & 0xffffff) + 1,
        h: ((b[27] | (b[28] << 8) | (b[29] << 16)) & 0xffffff) + 1,
      };
    }
  }
  return null;
}

const DIMS = new Map();
for (const f of existsSync(IMG_DIR) ? readdirSync(IMG_DIR) : []) {
  if (!/\.(png|webp|jpe?g|gif)$/i.test(f)) continue;
  try {
    const size = imageSize(path.join(IMG_DIR, f));
    if (size) DIMS.set(f.toLowerCase(), size);
  } catch {
    /* si no se puede leer, la figura simplemente no lleva width/height */
  }
}

/* ───────────────────────── Estructura del manual ─────────────────────────
   Orden y agrupación calcados del `<nav id="sidebar">` original.
   `id` es el ancla del HTML antiguo y también el slug de la página nueva,
   de forma que `/index.html#routers` → `/guia/routers`.                    */
const GROUPS = [
  {
    label: 'Inicio',
    items: [
      { id: 'inicio', label: '🏠 Introducción' },
      { id: 'primeros-pasos', label: '🚀 Primeros pasos' },
      { id: 'dashboard', label: '📊 Dashboard' },
    ],
  },
  {
    label: 'Uso de Plantilla y Carga de Data',
    items: [
      { id: 'plantilla', label: '📝 Uso de Plantilla' },
      { id: 'carga', label: '📊 Carga de Data' },
    ],
  },
  {
    label: 'Gestión de Red',
    items: [
      { id: 'routers', label: '📡 Routers' },
      { id: 'redes-ipv4', label: '🌐 Redes IPv4' },
      { id: 'redes-ipv6', label: '🌐 Redes IPv6' },
      { id: 'planes', label: '📶 Planes de servicio' },
      { id: 'nap', label: '📦 Cajas NAP' },
      { id: 'mapa', label: '🗺️ Mapa de red y clientes' },
      { id: 'smartolt', label: '🧠 SmartOLT' },
      { id: 'adminolt', label: '🛠️ AdminOLT' },
      { id: 'personalizado', label: '🧩 Servicios personalizados' },
    ],
  },
  {
    label: 'Gestión de Clientes',
    items: [
      { id: 'clientes', label: '👥 Listado de clientes' },
      { id: 'detalle-cliente', label: '👤 Detalle de cliente' },
      { id: 'facturacion-automatica', label: '🔁 Facturación automática' },
      { id: 'estados', label: '🚦 Estados' },
      { id: 'tickets', label: '🎫 Tickets' },
      { id: 'saldos-cargos', label: '💲 Saldos / Cargos' },
    ],
  },
  {
    label: 'Finanzas',
    items: [
      { id: 'proveedores', label: '🏢 Proveedores' },
      { id: 'registrar-pago', label: '💳 Registrar pago' },
      { id: 'pagos-registrados', label: '📋 Pagos registrados' },
      { id: 'promesas-pago', label: '🤝 Promesas de pago' },
      { id: 'compras', label: '🛒 Compras' },
      { id: 'ingresos-egresos', label: '💵 Ingresos / Egresos' },
      { id: 'personas', label: '🧍 Personas' },
      { id: 'facturas', label: '🧾 Facturas', tag: 'Clave' },
      { id: 'transacciones', label: '💰 Transacciones' },
      { id: 'productos', label: '📦 Productos y servicios' },
    ],
  },
  {
    label: 'Ajustes',
    items: [
      { id: 'ajustes', label: '⚙️ Panel de ajustes' },
      { id: 'cortes', label: '✂️ Configuración de cortes', tag: 'Clave' },
      { id: 'facturacion-ajustes', label: '💳 Facturación' },
      { id: 'olts-ajustes', label: '🔌 OLTs' },
      { id: 'logs-plantillas', label: '📄 Logs y plantillas' },
      { id: 'mensajeria', label: '📣 Mensajería' },
      { id: 'notificaciones', label: '🔔 Notificaciones' },
      { id: 'personal', label: '👨‍💼 Gestión de personal' },
      { id: 'roles-empresa', label: '🔐 Roles, empresa y sucursales' },
      { id: 'base-datos', label: '🗄️ Base de datos' },
      { id: 'sistema', label: '⬆️ Sistema' },
      { id: 'formas-pago', label: '🏦 Formas de pago' },
    ],
  },
  {
    label: 'Referencia',
    items: [
      { id: 'rutinas', label: '✅ Rutinas diarias' },
      { id: 'faq', label: '❓ Preguntas frecuentes' },
      { id: 'glosario', label: '📖 Glosario' },
    ],
  },
];

const ORDER = GROUPS.flatMap(g => g.items.map(i => i.id));
const ROUTE = id => `/guia/${id}`;

/* Los nombres reales en disco están en minúscula; el HTML original los
   referencia con mayúscula inicial (funciona en Windows, rompe en Linux). */
const IMG_CASE_FIX = {
  'assets/imgs/Aju.png': 'assets/imgs/aju.png',
  'assets/imgs/Ajust.png': 'assets/imgs/ajust.png',
  'assets/imgs/Men.png': 'assets/imgs/men.png',
};

const warnings = [];
const warn = m => { if (!warnings.includes(m)) warnings.push(m); };

/* ───────────────────────────── utilidades ───────────────────────────── */

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  rsaquo: '›', lsaquo: '‹', raquo: '»', laquo: '«',
  mdash: '—', ndash: '–', hellip: '…', middot: '·',
  bull: '•', times: '×', deg: '°', copy: '©',
  reg: '®', trade: '™', euro: '€', rsquo: '’',
  lsquo: '‘', ldquo: '“', rdquo: '”',
};

function decode(str) {
  return String(str)
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => (n in ENTITIES ? ENTITIES[n] : m));
}

/** Texto plano → texto seguro para MDX (JSX expressions, markdown inline). */
function esc(str, { table = false } = {}) {
  let s = decode(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\{/g, '&#123;')
    .replace(/\}/g, '&#125;')
    .replace(/([*`\[\]])/g, '\\$1');
  if (table) s = s.replace(/\|/g, '\\|');
  return s;
}

/** Texto para un atributo JSX (`caption="…"`). */
function attr(str) {
  return decode(str).replace(/\s+/g, ' ').trim().replace(/"/g, '&quot;');
}

const squash = s => s.replace(/\s+/g, ' ');
const classesOf = el => (el.getAttribute?.('class') || '').split(/\s+/).filter(Boolean);
const has = (el, c) => classesOf(el).includes(c);

const INLINE_TAGS = new Set(['strong', 'b', 'em', 'i', 'code', 'a', 'span', 'br', 'sup', 'sub', 'small', 'u', 'abbr']);

/** ¿El nodo solo contiene texto y etiquetas inline? Entonces es un párrafo. */
function isInlineOnly(el) {
  return (el.childNodes || []).every(
    n => n.nodeType === 3 || (n.nodeType === 1 && INLINE_TAGS.has(n.rawTagName?.toLowerCase())),
  );
}

/** `#routers` → `/guia/routers`; deja intactos http, mailto y tel. */
function resolveHref(href) {
  if (!href) return '#';
  const h = decode(href).trim();
  if (h.startsWith('#')) {
    const id = h.slice(1);
    if (ORDER.includes(id)) return ROUTE(id);
    warn(`Enlace interno sin destino conocido: ${h}`);
    return h;
  }
  return h;
}

function resolveSrc(src) {
  const clean = decode(src).trim().replace(/^\.?\//, '');
  const fixed = IMG_CASE_FIX[clean] || clean;
  return `/${fixed}`;
}

/* Textos alternativos correctos para las capturas de la sección Plantillas,
   donde el HTML original repetía "Listado de routers ISPMAX" en imágenes que
   no tienen nada que ver con routers. Descriptivos y útiles para el buscador. */
const ALT_OVERRIDES = {
  'gestion.png': 'Menú Gestión de Clientes en ISPMAX',
  'imp.png': 'Sección Redes IPv4 en ISPMAX',
  'impex.webp': 'Botón Descargar Excel de la plantilla',
  'impex.png': 'Cargar el archivo Excel de redes',
  'exx.png': 'Plantilla Excel de redes IPv4 rellenada',
};

/** Devuelve un `alt` útil: corrige los heredados incorrectos y evita vacíos. */
function improveAlt(raw, file, caption) {
  if (ALT_OVERRIDES[file]) return attr(ALT_OVERRIDES[file]);
  const alt = raw ? attr(raw) : '';
  if (alt && alt.toLowerCase() !== 'listado de routers ispmax') return alt;
  return caption || attr('Captura de ISPMAX');
}

/* Erratas heredadas del manual original (se corrigen en los pies de figura y
   en el texto). Solo cadenas inequívocas, para no alterar el sentido. */
const TYPO_FIXES = [
  [/\bClienes\b/g, 'Clientes'],
  [/\bContimuamos\b/g, 'Continuamos'],
  [/\bGestion de Clientes\b/g, 'Gestión de Clientes'],
  [/\bRellenamiento del Excel\b/gi, 'Plantilla Excel rellenada'],
];

function fixTypos(text) {
  let t = text;
  for (const [re, to] of TYPO_FIXES) t = t.replace(re, to);
  return t;
}

const improveCaption = text => fixTypos(text);

/* ─────────────────────────── conversión inline ─────────────────────────── */

function inline(node, ctx = {}) {
  if (!node) return '';
  if (node.nodeType === 3) return esc(node.rawText ?? node.text, ctx);
  if (node.nodeType !== 1) return '';

  const tag = node.rawTagName?.toLowerCase();
  const kids = () => node.childNodes.map(c => inline(c, ctx)).join('');

  switch (tag) {
    case 'strong':
    case 'b': {
      const inner = kids().trim();
      return inner ? `**${inner}**` : '';
    }
    case 'em':
    case 'i': {
      const inner = kids().trim();
      return inner ? `*${inner}*` : '';
    }
    case 'code':
      return `\`${decode(node.text).replace(/`/g, '\\`')}\``;
    case 'br':
      return ctx.table ? ' ' : '<br />';
    case 'a': {
      const href = resolveHref(node.getAttribute('href'));
      const inner = kids().trim() || esc(node.text, ctx);
      return `[${inner}](${href})`;
    }
    case 'span': {
      if (has(node, 'badge')) {
        const map = { green: 'tip', red: 'danger', yellow: 'warning', blue: 'info', gray: 'info' };
        const color = classesOf(node).find(c => c in map) || 'blue';
        const outline = color === 'gray' ? ' outline' : '';
        return `<Badge type="${map[color]}"${outline}>${attr(node.text)}</Badge>`;
      }
      if (has(node, 'callout-icon') || has(node, 'visually-hidden')) return '';
      return kids();
    }
    case 'img':
      return `<Figure src="${resolveSrc(node.getAttribute('src'))}" alt="${attr(node.getAttribute('alt') || '')}" inline />`;
    default:
      return kids();
  }
}

const inlineOf = (el, ctx) => squash(el.childNodes.map(c => inline(c, ctx)).join('')).trim();

/* ─────────────────────────── conversión de bloque ─────────────────────── */

function figureOf(el) {
  const img = el.querySelector('img');
  if (!img) return '';
  const cap = el.querySelector('figcaption');
  const style = el.getAttribute('style') || '';
  const rawMax =
    /--figure-max:\s*([\d.]+)px/.exec(style)?.[1] ||
    /max-width:\s*([\d.]+)px/.exec(style)?.[1] ||
    null;

  const variants = classesOf(el)
    .filter(c => c.startsWith('figure--'))
    .map(c => c.replace('figure--', ''));

  if (cap && cap.querySelectorAll('*').length > 0) {
    warn(`figcaption con marcado interno (se conserva como texto): "${squash(cap.text).slice(0, 60)}"`);
  }

  const srcAttr = decode(img.getAttribute('src')).trim().replace(/^\.?\//, '');
  const file = (IMG_CASE_FIX[srcAttr] || srcAttr).split('/').pop().toLowerCase();
  const dims = DIMS.get(file) || null;

  // Ancho efectivo: el tope que pidiera el HTML pero NUNCA por encima del
  // tamaño real del archivo. Así ninguna captura se amplía ni se ve borrosa.
  const declaredMax = rawMax ? Math.round(parseFloat(rawMax)) : null;
  let effectiveMax = declaredMax;
  if (dims) effectiveMax = Math.min(dims.w, declaredMax ?? dims.w);

  const captionText = cap ? improveCaption(attr(cap.text)) : null;
  const altText = improveAlt(img.getAttribute('alt'), file, captionText);

  const props = [
    `src="${resolveSrc(img.getAttribute('src'))}"`,
    `alt="${altText}"`,
  ];
  if (captionText) props.push(`caption="${captionText}"`);
  if (dims) {
    props.push(`width={${dims.w}}`);
    props.push(`height={${dims.h}}`);
  } else {
    if (img.getAttribute('width')) props.push(`width={${img.getAttribute('width')}}`);
    if (img.getAttribute('height')) props.push(`height={${img.getAttribute('height')}}`);
  }
  if (effectiveMax) props.push(`max="${effectiveMax}px"`);
  if (variants.length) props.push(`variant="${variants.join(' ')}"`);

  return `<Figure ${props.join(' ')} />`;
}

function tableOf(el) {
  const headCells = el.querySelectorAll('th');
  const rows = el.querySelectorAll('tr');
  const ctx = { table: true };

  const header = headCells.length
    ? headCells.map(th => inlineOf(th, ctx))
    : null;
  if (!header) { warn('Tabla sin <th>: se conserva la primera fila como cabecera.'); }

  const body = rows
    .filter(tr => tr.querySelectorAll('th').length === 0)
    .map(tr => tr.querySelectorAll('td').map(td => inlineOf(td, ctx) || ' '));

  const cols = header ? header.length : Math.max(...body.map(r => r.length));
  const pad = row => {
    const r = [...row];
    while (r.length < cols) r.push(' ');
    return r;
  };

  const lines = [];
  lines.push(`| ${pad(header ?? body.shift()).join(' | ')} |`);
  lines.push(`| ${Array.from({ length: cols }, () => '---').join(' | ')} |`);
  for (const r of body) lines.push(`| ${pad(r).join(' | ')} |`);
  return lines.join('\n');
}

function listOf(el, ordered, depth = 0) {
  const items = el.childNodes.filter(n => n.nodeType === 1 && n.rawTagName?.toLowerCase() === 'li');
  const pad = '  '.repeat(depth);
  return items
    .map((li, i) => {
      const marker = ordered ? `${i + 1}.` : '-';
      const nested = [];
      const own = [];
      for (const c of li.childNodes) {
        const t = c.nodeType === 1 ? c.rawTagName?.toLowerCase() : null;
        if (t === 'ul' || t === 'ol') nested.push(listOf(c, t === 'ol', depth + 1));
        else own.push(inline(c));
      }
      const text = squash(own.join('')).trim();
      return `${pad}${marker} ${text}${nested.length ? `\n${nested.join('\n')}` : ''}`;
    })
    .join('\n');
}

function cardOf(el) {
  // .info-card → <Card title><children/></Card>
  const heading = el.querySelector('h3');
  const title = heading ? squash(heading.text).trim() : '';
  const rest = el.childNodes.filter(n => n !== heading);
  const body = blocksOf({ childNodes: rest }, { headingLevel: 3 }).trim();
  return `<Card title="${attr(title)}">\n\n${body}\n\n</Card>`;
}

function heroCardOf(el) {
  const icon = el.querySelector('.ic');
  const strong = el.querySelector('strong');
  const span = el.querySelector('span:not(.ic)') || el.querySelectorAll('span').at(-1);
  return `<Card icon="${attr(icon?.text || '')}" title="${attr(strong?.text || '')}" href="${resolveHref(el.getAttribute('href'))}">\n\n${esc(squash(span?.text || '').trim())}\n\n</Card>`;
}

/**
 * Envuelve un bloque en un contenedor `:::`.
 *
 * La valla de cierre necesita una línea en blanco delante: sin ella, GFM se la
 * traga como una fila más de la tabla anterior.
 */
function container(type, title, body) {
  return `:::${type} ${title}\n\n${body.trim()}\n\n:::`;
}

const CALLOUTS = {
  tip: { type: 'tip', title: 'Consejo' },
  warn: { type: 'warning', title: 'Atención' },
  danger: { type: 'danger', title: 'Precaución' },
  info: { type: 'info', title: 'Información' },
  note: { type: 'note', title: 'Nota' },
};

function calloutOf(el, ctx) {
  const kind = classesOf(el).find(c => c in CALLOUTS) || 'info';
  const { type, title } = CALLOUTS[kind];
  const inner = el.childNodes.filter(n => !(n.nodeType === 1 && has(n, 'callout-icon')));
  const body = blocksOf({ childNodes: inner }, { ...ctx, inContainer: true });

  // Los contenedores `:::` no se pueden anidar. Dentro de otro contenedor
  // usamos el componente `Callout` nativo, que da exactamente el mismo HTML.
  if (ctx.inContainer) {
    return `<Callout type="${type}" title="${attr(title)}">\n\n${body.trim()}\n\n</Callout>`;
  }
  return container(type, title, body);
}

function stepsOf(el, ctx) {
  const steps = el.childNodes.filter(n => n.nodeType === 1 && has(n, 'step'));
  const inner = steps
    .map(s => {
      const bodyEl = s.querySelector('.step-body') || s;
      const body = bodyEl.querySelectorAll('*').length
        ? blocksOf(bodyEl, ctx).trim()
        : esc(squash(s.text).trim());
      return `<Step>\n\n${body}\n\n</Step>`;
    })
    .join('\n');
  return `<Steps>\n${inner}\n</Steps>`;
}

function detailsOf(el, ctx) {
  const summary = el.querySelector('summary');
  const title = summary ? squash(summary.text).trim() : 'Ver detalle';
  const inner = el.childNodes.filter(n => n !== summary);
  const body = blocksOf({ childNodes: inner }, { ...ctx, headingLevel: 3, inContainer: true });
  return container('details', title, body);
}

function blocksOf(node, ctx = {}) {
  const out = [];
  const level = ctx.headingLevel ?? 2;

  for (const child of node.childNodes || []) {
    if (child.nodeType === 3) {
      const t = squash(child.rawText).trim();
      if (t) out.push(esc(t));
      continue;
    }
    if (child.nodeType !== 1) continue;

    const tag = child.rawTagName?.toLowerCase();
    const cls = classesOf(child);

    // ── contenedores con semántica propia ──
    if (cls.includes('callout')) { out.push(calloutOf(child, ctx)); continue; }
    if (cls.includes('steps')) { out.push(stepsOf(child, ctx)); continue; }
    if (cls.includes('section-kicker')) { out.push(`<Kicker>${esc(squash(child.text).trim())}</Kicker>`); continue; }
    if (cls.includes('hero-grid')) {
      const cards = child.childNodes.filter(n => n.nodeType === 1 && has(n, 'hero-card')).map(heroCardOf);
      out.push(`<Cards columns={2}>\n${cards.join('\n')}\n</Cards>`);
      continue;
    }
    if (cls.includes('grid-3') || cls.includes('grid-2')) {
      const cards = child.childNodes
        .filter(n => n.nodeType === 1 && has(n, 'info-card'))
        .map(cardOf);
      const columns = cls.includes('grid-2') ? 2 : 3;
      out.push(`<Cards columns={${columns}}>\n${cards.join('\n')}\n</Cards>`);
      continue;
    }
    if (cls.includes('info-card')) { out.push(`<Cards columns={1}>\n${cardOf(child)}\n</Cards>`); continue; }
    if (cls.includes('fig-row') || cls.includes('fig-grid')) {
      const figs = child.querySelectorAll('figure').map(figureOf).filter(Boolean);
      const Comp = cls.includes('fig-row') ? 'FigRow' : 'FigGrid';
      out.push(`<${Comp}>\n${figs.join('\n')}\n</${Comp}>`);
      continue;
    }
    if (cls.includes('table-wrap') || cls.includes('inside')) {
      if (isInlineOnly(child)) {
        const text = inlineOf(child);
        if (text) out.push(text);
      } else {
        out.push(blocksOf(child, ctx));
      }
      continue;
    }
    if (cls.includes('no-results') || cls.includes('visually-hidden')) continue;

    // ── etiquetas ──
    switch (tag) {
      case 'h1':
      case 'h2': {
        out.push(`# ${inlineOf(child)}`);
        break;
      }
      case 'h3':
        out.push(`${'#'.repeat(level)} ${inlineOf(child)}`);
        break;
      case 'h4':
        out.push(`${'#'.repeat(Math.min(level + 1, 6))} ${inlineOf(child)}`);
        break;
      case 'p': {
        const text = inlineOf(child);
        if (!text) break;
        out.push(cls.includes('section-desc') ? `<Lead>${text}</Lead>` : text);
        break;
      }
      case 'ul':
      case 'ol':
        out.push(listOf(child, tag === 'ol'));
        break;
      case 'table':
        out.push(tableOf(child));
        break;
      case 'figure':
        out.push(figureOf(child));
        break;
      case 'details':
        out.push(detailsOf(child, ctx));
        break;
      case 'hr':
        out.push('---');
        break;
      case 'img':
        out.push(`<Figure src="${resolveSrc(child.getAttribute('src'))}" alt="${attr(child.getAttribute('alt') || '')}" />`);
        break;
      case 'section':
      case 'div': {
        // Un <div> que solo lleva texto y etiquetas inline es, en la práctica,
        // un párrafo (así están escritos los cuerpos de los callouts).
        if (isInlineOnly(child)) {
          const text = inlineOf(child);
          if (text) out.push(text);
        } else {
          out.push(blocksOf(child, ctx));
        }
        break;
      }
      case 'footer':
      case 'nav':
      case 'script':
      case 'style':
        break;
      default: {
        const text = inlineOf(child);
        if (text) out.push(text);
      }
    }
  }

  return out.filter(Boolean).join('\n\n');
}

/* ───────────────────────────────── main ───────────────────────────────── */

const raw = readFileSync(HTML, 'utf8');
const mainStart = raw.indexOf('<main id="content"');
const mainEnd = raw.indexOf('</main>');
if (mainStart < 0 || mainEnd < 0) {
  console.error('No encuentro <main id="content"> en index.html');
  process.exit(1);
}
let body = raw.slice(raw.indexOf('>', mainStart) + 1, mainEnd);

// `</figure></ol>` — cierres huérfanos en la sección de plantillas.
body = body.replace(/<\/figure>\s*<\/ol>/g, '</figure>');

const openTag = /<section\b[^>]*>/g;
const found = [];
let m;
while ((m = openTag.exec(body)) !== null) {
  const id = /id="([^"]+)"/.exec(m[0])?.[1];
  const search = /data-search="([^"]*)"/.exec(m[0])?.[1] || '';
  const cls = /class="([^"]*)"/.exec(m[0])?.[1] || '';
  if (!id) { warn(`<section> sin id en offset ${m.index}`); continue; }
  found.push({ id, search, cls, start: m.index + m[0].length });
}

const footerAt = body.indexOf('<footer');
for (let i = 0; i < found.length; i++) {
  const next = found[i + 1];
  found[i].end = next ? next.start - (body.lastIndexOf('<section', next.start) === -1 ? 0 : 0) : (footerAt > 0 ? footerAt : body.length);
  if (next) {
    // recortar justo antes de la etiqueta <section> siguiente
    found[i].end = body.lastIndexOf('<section', next.start);
  }
}

const bySlug = new Map(found.map(s => [s.id, s]));
const missing = ORDER.filter(id => !bySlug.has(id));
const extra = found.map(s => s.id).filter(id => !ORDER.includes(id));
if (missing.length) { console.error(`[migrate] Faltan secciones en el HTML: ${missing.join(', ')}`); process.exit(1); }
if (extra.length) warn(`Secciones presentes en el HTML pero no en el índice: ${extra.join(', ')}`);

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

const meta = [];
let imagesEmitted = 0;
let tablesEmitted = 0;

for (const [index, id] of ORDER.entries()) {
  const sec = bySlug.get(id);
  const chunk = body.slice(sec.start, sec.end);
  const dom = parse(chunk, { blockTextElements: { script: false, style: false } });

  const titleEl = dom.querySelector('.section-title') || dom.querySelector('h1') || dom.querySelector('h2');
  const title = fixTypos(titleEl ? squash(titleEl.text).trim() : id);
  const descEl = dom.querySelector('.section-desc') || dom.querySelector('p');
  const description = descEl ? fixTypos(squash(decode(descEl.text)).trim()).slice(0, 180) : '';

  let content = blocksOf(dom, { headingLevel: 2 });

  imagesEmitted += (content.match(/<Figure /g) || []).length;
  tablesEmitted += (content.match(/^\| ---/gm) || []).length;

  // limpiezas finales + corrección de erratas heredadas
  content = fixTypos(content)
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+$/gm, '')
    .trim();

  const label = GROUPS.flatMap(g => g.items).find(i => i.id === id).label;
  const front = [
    '---',
    `title: ${JSON.stringify(title)}`,
    description ? `description: ${JSON.stringify(description)}` : null,
    'head:',
    `  - - meta`,
    `    - name: keywords`,
    `      content: ${JSON.stringify(sec.search || title.toLowerCase())}`,
    '---',
  ].filter(Boolean).join('\n');

  const searchTerms = sec.search ? `\n\n<SearchTerms terms="${attr(sec.search)}" />` : '';
  writeFileSync(path.join(OUT_DIR, `${id}.mdx`), `${front}\n\n${content}${searchTerms}\n`, 'utf8');

  meta.push({ id, title, label, index });
}

/* Sidebar generado desde la misma fuente de verdad. */
const sidebar = GROUPS.map(g => ({
  sectionHeader: g.label,
  items: g.items.map(i => ({ text: i.label, link: ROUTE(i.id), ...(i.tag ? { tag: i.tag } : {}) })),
}));
writeFileSync(
  path.join(root, 'docs', 'sidebar.json'),
  `${JSON.stringify(sidebar, null, 2)}\n`,
  'utf8',
);

/* Mapa de anclas antiguas → rutas nuevas (usado por LegacyHashRedirect). */
writeFileSync(
  path.join(root, 'src', 'legacy-routes.json'),
  `${JSON.stringify(Object.fromEntries(ORDER.map(id => [id, ROUTE(id)])), null, 2)}\n`,
  'utf8',
);

console.log(`[migrate] ${ORDER.length} páginas MDX en docs/guia/`);
console.log(`[migrate] ${imagesEmitted} figuras · ${tablesEmitted} tablas`);
if (warnings.length) {
  console.log('[migrate] avisos:');
  for (const w of warnings) console.log(`  · ${w}`);
}
