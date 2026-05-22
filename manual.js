/* ══════════════════════════════════════════════
   ISPMAX · Manual de Usuario — Lógica de interfaz
   ──────────────────────────────────────────────
   Cambios respecto a la versión single-file:
   • Search: debounce + índice de texto precalculado
     (evita reflows en cada tecla).
   • Scroll: rAF coalescing + IntersectionObserver
     para sección activa (cero costo en scroll).
   • Lightbox: focus trap, manejo correcto de
     aria-modal/aria-hidden, scroll-lock con
     restauración, sin double-tap redundante.
   • Storage: helper safeStorage para modo incógnito.
   • Atajos: '/' y Ctrl/Cmd+K para enfocar búsqueda.
   • Tema: escucha cambios del sistema cuando no
     hay preferencia guardada.
   • Anuncios ARIA para resultados de búsqueda.
   • <details> persistente.
   • Título dinámico según sección visible.
   ════════════════════════════════════════════ */
(function(){
'use strict';

/* ── Safe localStorage helper ─────────────────
   Modo incógnito o cookies bloqueadas pueden
   lanzar al usar localStorage. Aislamos el riesgo. */
const safeStorage = (() => {
  let available = true;
  try{
    const k='__ispmax_probe__';
    window.localStorage.setItem(k,'1');
    window.localStorage.removeItem(k);
  }catch(e){
    available = false;
  }
  return {
    get(key){
      if(!available) return null;
      try{ return window.localStorage.getItem(key); }
      catch{ return null; }
    },
    set(key,val){
      if(!available) return false;
      try{ window.localStorage.setItem(key,val); return true; }
      catch{ return false; }
    },
    remove(key){
      if(!available) return false;
      try{ window.localStorage.removeItem(key); return true; }
      catch{ return false; }
    }
  };
})();

/* ── Safe sessionStorage helper ───────────────
   Mismo contrato que safeStorage pero los datos
   se borran al cerrar la pestaña. Usado por el
   checklist de "sección leída". */
const safeSession = (() => {
  let available = true;
  try{
    const k='__ispmax_probe_s__';
    window.sessionStorage.setItem(k,'1');
    window.sessionStorage.removeItem(k);
  }catch(e){
    available = false;
  }
  return {
    get(key){
      if(!available) return null;
      try{ return window.sessionStorage.getItem(key); }
      catch{ return null; }
    },
    set(key,val){
      if(!available) return false;
      try{ window.sessionStorage.setItem(key,val); return true; }
      catch{ return false; }
    },
    remove(key){
      if(!available) return false;
      try{ window.sessionStorage.removeItem(key); return true; }
      catch{ return false; }
    }
  };
})();

/* ══════════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════════ */
function goTo(id){
  const el = document.getElementById(id);
  if(!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - 78;
  window.scrollTo({top, behavior:'smooth'});
  history.replaceState(null,'','#'+id);
  if(window.innerWidth < 850) document.body.classList.remove('sidebar-open');
}
/* Expose for inline onclick=... we'll remove from HTML but keep for back-compat */
window.goTo = goTo;

/* Deep link on load */
window.addEventListener('load', () => {
  const hash = window.location.hash.replace('#','');
  if(hash){
    const el = document.getElementById(hash);
    if(el){
      setTimeout(() => {
        const top = el.getBoundingClientRect().top + window.scrollY - 78;
        window.scrollTo({top, behavior:'auto'});
      }, 120);
    }
  }
  initCopyAnchors();
  updateReadStats();
  restoreOpenDetails();
});

/* Nav links: delegated, single binding */
document.querySelectorAll('.nav-link').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    goTo(a.dataset.target);
  });
});

/* Hero cards: replace inline onclick */
document.querySelectorAll('[data-goto]').forEach(el => {
  el.addEventListener('click', e => {
    e.preventDefault();
    goTo(el.dataset.goto);
  });
});

/* ══════════════════════════════════════════════
   ACTIVE LINK ON SCROLL + READ MARKING
   Uses IntersectionObserver + rAF for performance.
══════════════════════════════════════════════ */
const links = [...document.querySelectorAll('.nav-link')];
const sections = [...document.querySelectorAll('.doc-section')];
const baseTitle = document.title;
let activeId = '';
let rafPending = false;

function pickActiveSection(){
  /* Pick the last section whose top is above the threshold */
  let cur = '';
  for(const s of sections){
    if(s.classList.contains('hidden')) continue;
    if(s.getBoundingClientRect().top <= 120) cur = s.id;
  }
  return cur;
}

function applyActive(id){
  if(id === activeId) return;
  activeId = id;
  links.forEach(l => l.classList.toggle('active', l.dataset.target === id));
  /* Update document title with active section */
  if(id){
    const section = document.getElementById(id);
    const title = section?.querySelector('.section-title, h1')?.textContent?.trim()
                  ?.replace(/copiar enlace$/,'').trim();
    if(title) document.title = title + ' · ' + baseTitle;
  } else {
    document.title = baseTitle;
  }
}

function markReadVisible(){
  sections.forEach(s => {
    if(s.classList.contains('hidden')) return;
    if(s.getBoundingClientRect().bottom < 80){
      markRead(s.id);
    }
  });
}

function onScrollTick(){
  if(rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    applyActive(pickActiveSection());
    markReadVisible();
    updateProgress();
  });
}
window.addEventListener('scroll', onScrollTick, {passive:true});
window.addEventListener('resize', onScrollTick, {passive:true});
onScrollTick();

/* ══════════════════════════════════════════════
   READING PROGRESS BAR
   Honest progress: ignores hidden (filtered) sections.
══════════════════════════════════════════════ */
const progressBar = document.getElementById('read-progress');
function updateProgress(){
  if(!progressBar) return;
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const pct = docHeight > 0 ? Math.min(1, Math.max(0, scrollTop / docHeight)) : 0;
  progressBar.style.transform = 'scaleX(' + pct + ')';
}

/* ══════════════════════════════════════════════
   THEME TOGGLE — fast 80ms transition
══════════════════════════════════════════════ */
const themeBtn = document.getElementById('theme-toggle');
const mqLight = window.matchMedia('(prefers-color-scheme: light)');

/* Holder for the timeout that removes .theme-changing */
let themeChangingTimer = null;

function applyTheme(light, persist){
  /* Disable all transitions during swap so the change feels instant.
     We force a reflow to commit the "no transition" state, then swap,
     then remove the class on next frame to re-enable transitions. */
  const root = document.documentElement;
  root.classList.add('theme-changing');
  /* Force style flush */
  void root.offsetHeight;

  document.body.classList.toggle('light', light);
  themeBtn.textContent = light ? '🌑' : '🌙';
  themeBtn.setAttribute('aria-pressed', light ? 'true' : 'false');

  if(persist){
    safeStorage.set('ispmax-theme', light ? 'light' : 'dark');
  }

  /* Re-enable transitions after the browser has painted the new theme.
     Two rAFs guarantees the swap frame is rendered before transitions
     come back, so subsequent hovers/animations behave normally. */
  clearTimeout(themeChangingTimer);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      root.classList.remove('theme-changing');
    });
  });
  /* Safety net in case rAF never fires (background tab, etc.) */
  themeChangingTimer = setTimeout(() => {
    root.classList.remove('theme-changing');
  }, 200);
}

/* Restore saved preference */
(function initTheme(){
  const saved = safeStorage.get('ispmax-theme');
  const preferLight = saved ? saved === 'light' : mqLight.matches;
  applyTheme(preferLight, false);
  document.documentElement.classList.remove('light-pre');
})();

themeBtn.addEventListener('click', () => {
  applyTheme(!document.body.classList.contains('light'), true);
});

/* React to OS theme changes if user has no saved preference */
function onSystemThemeChange(e){
  if(!safeStorage.get('ispmax-theme')){
    applyTheme(e.matches, false);
  }
}
if(mqLight.addEventListener){
  mqLight.addEventListener('change', onSystemThemeChange);
} else if(mqLight.addListener){
  mqLight.addListener(onSystemThemeChange); /* Safari < 14 */
}

/* ══════════════════════════════════════════════
   SIDEBAR TOGGLE
══════════════════════════════════════════════ */
document.getElementById('sidebar-toggle').addEventListener('click', () => {
  if(window.innerWidth < 850){
    document.body.classList.toggle('sidebar-open');
  } else {
    document.body.classList.toggle('sidebar-hidden');
  }
});

/* ══════════════════════════════════════════════
   SEARCH — debounced, indexed, highlighted
══════════════════════════════════════════════ */
const searchInput = document.getElementById('doc-search');
const mobileSearchInput = document.getElementById('doc-search-mobile');
const noResults = document.getElementById('no-results');
const searchCount = document.getElementById('search-count');

/* Build a text index once: { sectionEl, normalisedText } */
function normalise(s){ return s.toLowerCase(); }
const searchIndex = sections.map(s => ({
  el: s,
  text: normalise(s.innerText + ' ' + (s.dataset.search || ''))
}));

function escapeRe(str){ return str.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }

function clearHighlights(root){
  root.querySelectorAll('mark.hl').forEach(m => {
    const parent = m.parentNode;
    if(!parent) return;
    parent.replaceChild(document.createTextNode(m.textContent), m);
    parent.normalize();
  });
}

/* Walks text nodes wrapping matches in <mark class="hl">.
   Skips SCRIPT, STYLE, MARK, CODE and the copy-link button. */
const SKIP_TAGS = new Set(['SCRIPT','STYLE','MARK','CODE']);
function highlightText(node, re){
  if(node.nodeType === 3){
    const val = node.nodeValue;
    if(!re.test(val)) return;
    re.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let last = 0, m;
    while((m = re.exec(val)) !== null){
      if(m.index > last) frag.appendChild(document.createTextNode(val.slice(last, m.index)));
      const mark = document.createElement('mark');
      mark.className = 'hl';
      mark.textContent = m[0];
      frag.appendChild(mark);
      last = re.lastIndex;
      /* Guard against zero-width match infinite loop */
      if(m.index === re.lastIndex) re.lastIndex++;
    }
    if(last < val.length) frag.appendChild(document.createTextNode(val.slice(last)));
    node.parentNode.replaceChild(frag, node);
  } else if(node.nodeType === 1
            && !SKIP_TAGS.has(node.tagName)
            && !node.classList.contains('section-anchor')){
    /* Clone childNodes list before iterating — DOM may change */
    [...node.childNodes].forEach(c => highlightText(c, re));
  }
}

function runSearch(q){
  const ql = normalise(q);
  let visibleCount = 0;

  searchIndex.forEach(entry => {
    clearHighlights(entry.el);
    const ok = !ql || entry.text.includes(ql);
    entry.el.classList.toggle('hidden', !ok);
    if(ok){
      visibleCount++;
      if(ql.length > 1){
        const re = new RegExp(escapeRe(q), 'gi');
        highlightText(entry.el, re);
      }
    }
  });

  /* No-results message */
  if(!visibleCount && ql){
    noResults.classList.add('show');
  } else {
    noResults.classList.remove('show');
  }

  /* Result count chip + ARIA announcement */
  if(ql){
    searchCount.textContent = visibleCount + ' resultado' + (visibleCount === 1 ? '' : 's');
    searchCount.classList.add('show');
  } else {
    searchCount.classList.remove('show');
    searchCount.textContent = '';
  }

  /* Recompute progress (some sections may be hidden now) */
  updateProgress();
  applyActive(pickActiveSection());
}

/* Debounce wrapper */
let searchTimer = null;
function debouncedSearch(q){
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => runSearch(q), 140);
}

/* Sync mobile <-> desktop inputs without re-triggering each other */
let syncing = false;
function bindSearch(input, peer){
  input.addEventListener('input', () => {
    if(syncing) return;
    syncing = true;
    peer.value = input.value;
    syncing = false;
    debouncedSearch(input.value.trim());
  });
  /* Enter jumps to first visible result */
  input.addEventListener('keydown', e => {
    if(e.key === 'Enter'){
      e.preventDefault();
      const first = document.querySelector('.doc-section:not(.hidden)');
      if(first) goTo(first.id);
    } else if(e.key === 'Escape'){
      input.value = '';
      peer.value = '';
      runSearch('');
      input.blur();
    }
  });
}
bindSearch(searchInput, mobileSearchInput);
bindSearch(mobileSearchInput, searchInput);

/* Keyboard shortcut: '/' or Ctrl/Cmd+K focuses search */
document.addEventListener('keydown', e => {
  const tag = (e.target && e.target.tagName) || '';
  const inField = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable);
  /* Ctrl/Cmd + K */
  if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'){
    e.preventDefault();
    focusSearch();
    return;
  }
  /* '/' when not typing in a field */
  if(e.key === '/' && !inField){
    e.preventDefault();
    focusSearch();
  }
});
function focusSearch(){
  const target = window.innerWidth <= 850 ? mobileSearchInput : searchInput;
  target.focus();
  target.select();
}

/* ══════════════════════════════════════════════
   COPY SECTION LINK
══════════════════════════════════════════════ */
const COPY_SVG = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';

function initCopyAnchors(){
  document.querySelectorAll('.doc-section').forEach(s => {
    const title = s.querySelector('.section-title, h2, h1');
    if(!title || title.querySelector('.section-anchor')) return;
    const btn = document.createElement('button');
    btn.className = 'section-anchor';
    btn.title = 'Copiar enlace a esta sección';
    btn.setAttribute('aria-label','Copiar enlace a esta sección');
    btn.innerHTML = COPY_SVG + ' copiar enlace';
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const url = location.origin + location.pathname + '#' + s.id;
      const onOK = () => {
        btn.textContent = '✓ copiado';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.innerHTML = COPY_SVG + ' copiar enlace';
          btn.classList.remove('copied');
        }, 2000);
      };
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(url).then(onOK).catch(() => fallbackCopy(url, onOK));
      } else {
        fallbackCopy(url, onOK);
      }
    });
    title.appendChild(btn);
  });
}

function fallbackCopy(text, onOK){
  /* Best-effort fallback for old browsers / non-https */
  try{
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly','');
    ta.style.position = 'absolute';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    onOK();
  } catch(e){
    /* swallow */
  }
}

/* ══════════════════════════════════════════════
   READ CHECKLIST (sessionStorage — solo sesión actual)
══════════════════════════════════════════════ */
const READ_KEY = 'ispmax-read-v1';

/* One-time cleanup: previous versions persisted this in
   localStorage, which kept marks across sessions. Borramos
   esa entrada para no arrastrar marcas viejas. */
safeStorage.remove(READ_KEY);

function getReadSet(){
  const raw = safeSession.get(READ_KEY);
  if(!raw) return new Set();
  try{ return new Set(JSON.parse(raw)); }
  catch{ return new Set(); }
}
function saveReadSet(set){
  safeSession.set(READ_KEY, JSON.stringify([...set]));
}
function markRead(id){
  const set = getReadSet();
  if(set.has(id)) return;
  set.add(id);
  saveReadSet(set);
  const link = document.querySelector('.nav-link[data-target="'+id+'"]');
  if(link) link.classList.add('read-done');
  updateReadStats();
}
function initReadState(){
  const set = getReadSet();
  set.forEach(id => {
    const link = document.querySelector('.nav-link[data-target="'+id+'"]');
    if(link) link.classList.add('read-done');
  });
}
function updateReadStats(){
  const el = document.getElementById('read-stats');
  if(!el) return;
  const set = getReadSet();
  const total = sections.length;
  const done = set.size;
  if(done === 0){ el.textContent = ''; return; }
  el.textContent = done + '/' + total + ' secciones leídas';
}
initReadState();

/* ══════════════════════════════════════════════
   <details> STATE PERSISTENCE
══════════════════════════════════════════════ */
const DETAILS_KEY = 'ispmax-details-v1';

function detailsKey(d){
  /* Stable key based on the summary text + nearest section id */
  const sec = d.closest('.doc-section');
  const sid = sec ? sec.id : 'root';
  const sum = (d.querySelector('summary')?.textContent || '').trim().slice(0,80);
  return sid + '::' + sum;
}
function getOpenDetails(){
  const raw = safeStorage.get(DETAILS_KEY);
  if(!raw) return new Set();
  try{ return new Set(JSON.parse(raw)); }
  catch{ return new Set(); }
}
function saveOpenDetails(set){
  safeStorage.set(DETAILS_KEY, JSON.stringify([...set]));
}
function restoreOpenDetails(){
  const open = getOpenDetails();
  document.querySelectorAll('details').forEach(d => {
    const k = detailsKey(d);
    if(open.has(k)) d.open = true;
    d.addEventListener('toggle', () => {
      const current = getOpenDetails();
      if(d.open) current.add(k); else current.delete(k);
      saveOpenDetails(current);
    });
  });
}

/* ══════════════════════════════════════════════
   LIGHTBOX — accessible modal
══════════════════════════════════════════════ */
const lb = document.getElementById('lightbox');
const lbImg = document.getElementById('lb-img');
const lbCap = document.getElementById('lb-caption');
const lbClose = document.getElementById('lb-close');

let lbTrigger = null;
let savedBodyOverflow = '';
let savedBodyPaddingRight = '';

function getScrollbarWidth(){
  return window.innerWidth - document.documentElement.clientWidth;
}

function openLightbox(src, alt, caption, trigger){
  lbImg.src = src;
  lbImg.alt = alt || '';
  lbCap.textContent = caption || '';
  lb.classList.add('open');
  lb.setAttribute('aria-hidden','false');
  lb.setAttribute('aria-modal','true');
  /* Save and apply scroll lock, compensate scrollbar to avoid layout jump */
  savedBodyOverflow = document.body.style.overflow;
  savedBodyPaddingRight = document.body.style.paddingRight;
  const sbw = getScrollbarWidth();
  if(sbw > 0) document.body.style.paddingRight = sbw + 'px';
  document.body.style.overflow = 'hidden';
  lbTrigger = trigger || null;
  /* Focus the close button */
  setTimeout(() => lbClose.focus(), 0);
}

function closeLightbox(){
  if(!lb.classList.contains('open')) return;
  lb.classList.remove('open');
  lb.setAttribute('aria-hidden','true');
  lb.removeAttribute('aria-modal');
  document.body.style.overflow = savedBodyOverflow;
  document.body.style.paddingRight = savedBodyPaddingRight;
  setTimeout(() => { lbImg.src = ''; }, 300);
  if(lbTrigger){
    try{ lbTrigger.focus(); }catch{ /* ignore */ }
    lbTrigger = null;
  }
}

/* Open on click of any .doc-img (also works on touch — no separate handler needed) */
document.addEventListener('click', e => {
  const img = e.target.closest('.doc-img');
  if(!img || img.classList.contains('img-error')) return;
  const fig = img.closest('.figure');
  const caption = fig ? (fig.querySelector('figcaption')?.textContent || '') : '';
  openLightbox(img.src, img.alt, caption, img);
});

lbClose.addEventListener('click', closeLightbox);
lb.addEventListener('click', e => { if(e.target === lb) closeLightbox(); });

/* Keyboard: ESC closes, Tab is trapped inside the dialog while open */
document.addEventListener('keydown', e => {
  if(!lb.classList.contains('open')) return;
  if(e.key === 'Escape'){
    closeLightbox();
    return;
  }
  if(e.key === 'Tab'){
    /* Only one focusable element (close button) → trap focus on it */
    e.preventDefault();
    lbClose.focus();
  }
});

/* ══════════════════════════════════════════════
   IMAGE LOADING FALLBACK
══════════════════════════════════════════════ */
document.querySelectorAll('img.doc-img').forEach(img => {
  img.addEventListener('error', () => {
    img.classList.add('img-error');
    img.removeAttribute('src');
    img.alt = img.alt || 'Imagen no disponible';
    /* Show alt text inline as a placeholder */
    img.setAttribute('aria-label', img.alt);
    /* Make non-clickable */
    img.style.cursor = 'default';
    /* If alt is empty, show generic text */
    if(!img.textContent){
      const note = document.createElement('span');
      note.textContent = '⚠ ' + (img.alt || 'Imagen no disponible');
      note.style.pointerEvents = 'none';
      /* Insert next to image if not already */
      const parent = img.parentNode;
      if(parent && !parent.querySelector('.img-error-note')){
        note.className = 'img-error-note';
        note.style.display = 'block';
        note.style.padding = '24px';
        note.style.color = 'var(--faint)';
        note.style.fontFamily = 'var(--mono)';
        note.style.fontSize = '12px';
        note.style.textAlign = 'center';
        parent.insertBefore(note, img);
        img.style.display = 'none';
      }
    }
  }, {once:true});
});

})();