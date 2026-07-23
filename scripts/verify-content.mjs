/**
 * Comprobación de fidelidad de la migración.
 *
 * Compara el texto renderizado del manual antiguo (`<main>` de index.html)
 * con el texto renderizado del sitio Rspress ya construido (`dist/**\/*.html`).
 * Al comparar salida contra salida no hay ruido de sintaxis Markdown/JSX.
 *
 * Requiere haber ejecutado `npm run build` antes.
 *
 *   node scripts/verify-content.mjs
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'node-html-parser';

/* ── Comparación ──
   El HTML original está indentado y el generado va minificado, así que
   `.text` pegaría celdas contiguas (`ColumnaDescripción`). Sustituimos cada
   etiqueta por un espacio en ambos lados para comparar en igualdad. */
const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsaquo: '›',
  mdash: '—', ndash: '–', hellip: '…', middot: '·', bull: '•', times: '×',
  deg: '°', copy: '©', euro: '€', rsquo: '’', ldquo: '“', rdquo: '”',
};

const textOf = html =>
  html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => (n in ENTITIES ? ENTITIES[n] : m));


const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(root, 'dist');

if (!existsSync(DIST)) {
  console.error('No existe dist/. Ejecuta `npm run build` primero.');
  process.exit(1);
}

/* ── Original ── */
const raw = readFileSync(path.join(root, 'index.html'), 'utf8');
const mainHtml = raw.slice(
  raw.indexOf('>', raw.indexOf('<main id="content"')) + 1,
  raw.indexOf('</main>'),
);
const oldDom = parse(mainHtml);
oldDom.querySelectorAll('.no-results').forEach(n => n.remove());

const oldImgs = new Set(
  oldDom.querySelectorAll('img').map(i => i.getAttribute('src').toLowerCase().replace(/^\.?\//, '')),
);
const oldExternal = new Set(
  oldDom
    .querySelectorAll('a')
    .map(a => a.getAttribute('href') || '')
    .filter(h => /^(https?:|mailto:|tel:)/.test(h)),
);

/* ── Migrado ── */
const walk = dir =>
  readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'static' ? [] : walk(p);
    return e.name.endsWith('.html') ? [p] : [];
  });

const pages = walk(DIST);
let newText = '';
const newImgs = new Set();
const newExternal = new Set();

for (const file of pages) {
  const dom = parse(readFileSync(file, 'utf8'));
  // Contenido de la página + la portada (hero/features/pie).
  const scope = dom.querySelector('.rspress-doc') || dom.querySelector('main') || dom;
  newText += `\n${textOf(scope.innerHTML)}`;
  for (const img of dom.querySelectorAll('img')) {
    newImgs.add((img.getAttribute('src') || '').toLowerCase().replace(/^\.?\//, ''));
  }
  for (const a of dom.querySelectorAll('a')) {
    const h = a.getAttribute('href') || '';
    if (/^(https?:|mailto:|tel:)/.test(h)) newExternal.add(h);
  }
}

/* ── Comparación ── */
const normalize = s =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(' ')
    .filter(w => w.length > 1);

const bag = words => {
  const m = new Map();
  for (const w of words) m.set(w, (m.get(w) || 0) + 1);
  return m;
};

const oldBag = bag(normalize(textOf(oldDom.innerHTML)));
const newBag = bag(normalize(newText));

/* Erratas del manual original que la migración corrige a propósito: no deben
   contar como pérdida de contenido. */
const CORRECTED_TYPOS = new Set(['clienes', 'contimuamos', 'rellenamiento']);

const missingWords = [];
for (const [w, n] of oldBag) {
  if (CORRECTED_TYPOS.has(w)) continue;
  const got = newBag.get(w) || 0;
  if (got < n) missingWords.push({ w, n, got });
}

const missingImgs = [...oldImgs].filter(src => ![...newImgs].some(n => n.endsWith(src)));
const missingLinks = [...oldExternal].filter(h => !newExternal.has(h));

/* ── Estructura: mismo número de bloques que el original ── */
const countOld = sel => oldDom.querySelectorAll(sel).length;
let allHtml = '';
for (const f of pages) allHtml += readFileSync(f, 'utf8');
const countNew = re => (allHtml.match(re) || []).length;

const structure = [
  ['figuras', countOld('figure'), countNew(/isp-figure__frame/g)],
  ['tablas', countOld('table'), countNew(/<table/g)],
  ['bloques desplegables', countOld('details'), countNew(/rp-callout--details/g)],
  [
    'avisos (callouts)',
    countOld('.callout'),
    countNew(/rp-callout--(?!details)[a-z]+/g),
  ],
  ['pasos', countOld('.step'), countNew(/class="isp-step"/g)],
  ['tarjetas', countOld('.info-card') + countOld('.hero-card'), countNew(/class="isp-card[ "]/g)],
];

console.log('── Estructura ──');
for (const [name, before, after] of structure) {
  const mark = after >= before ? '✓' : '⚠';
  console.log(`${mark} ${name.padEnd(22)} ${String(before).padStart(4)} → ${after}`);
}
const structureOk = structure.every(([, before, after]) => after >= before);
console.log('');

const total = [...oldBag.values()].reduce((a, b) => a + b, 0);
const lost = missingWords.reduce((a, m) => a + (m.n - m.got), 0);
const cobertura = ((total - lost) / total) * 100;

console.log('── Fidelidad index.html → Rspress ──');
console.log(`Páginas generadas   : ${pages.length}`);
console.log(`Palabras originales : ${total}`);
console.log(`Cobertura de texto  : ${cobertura.toFixed(2)}%`);
console.log(`Imágenes            : ${oldImgs.size - missingImgs.length}/${oldImgs.size}`);
console.log(`Enlaces externos    : ${oldExternal.size - missingLinks.length}/${oldExternal.size}`);

if (missingImgs.length) console.log('\n⚠ Imágenes ausentes:', missingImgs);
if (missingLinks.length) console.log('\n⚠ Enlaces ausentes:', missingLinks);
if (missingWords.length) {
  console.log(`\n⚠ ${missingWords.length} términos con menos apariciones:`);
  for (const m of missingWords.slice(0, 40)) console.log(`   ${m.w}: ${m.got}/${m.n}`);
  if (missingWords.length > 40) console.log(`   … y ${missingWords.length - 40} más`);
}

process.exitCode =
  missingImgs.length || missingLinks.length || cobertura < 99.9 || !structureOk ? 1 : 0;
