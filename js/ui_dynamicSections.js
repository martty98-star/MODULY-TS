// ===================================================================================
// Module: ui_dynamicSections.js
// Purpose: Práce s <template> sekcemi, dynamické řádky, select filtering
// ===================================================================================

// === Pomocné funkce pro načítání options z template elementů =======================

/**
 * Načte všechny <option> z template podle data-type
 * @param {string} type - typ sekce (např. "plakety", "chl", atd.)
 * @returns {Array<{value: string, text: string}>}
 */
export function getOptionsFor(type) {
  const tpl = document.querySelector(`template[data-type="${type}"]`);
  if (!tpl) return [];
  const frag = tpl.content.cloneNode(true);
  const select = frag.querySelector('select');
  if (!select) return [];
  return Array.from(select.options).map(o => ({ value: o.value, text: o.textContent }));
}

/**
 * Vrátí první neprázdnou value z options pro daný typ
 * @param {string} type
 * @returns {string}
 */
export function getFirstOptionValue(type) {
  const opts = getOptionsFor(type);
  const first = opts.find(o => (o.value || '').toString().trim() !== '');
  return first ? first.value : '';
}

/**
 * Globální bezpečný setter pro .value (nepadá, když prvek chybí)
 * @param {string} id - ID elementu
 * @param {any} v - hodnota k nastavení
 */
export function setVal(id, v) {
  const el = document.getElementById(id);
  if (el) el.value = v ?? '';
}

// === Továrna na dynamické řádky =====================================================

let scheduleSaveDraftFn = null;
let attachAutosaveListenersFn = null;

/**
 * Nastaví callback funkce z jiných modulů
 */
export function setCallbacks({ scheduleSaveDraft, attachAutosaveListeners }) {
  scheduleSaveDraftFn = scheduleSaveDraft;
  attachAutosaveListenersFn = attachAutosaveListeners;
}

/**
 * Vytvoří nový řádek pro sekci (select + qty + delete button)
 * @param {string} type - typ sekce
 * @param {Object} preset - přednastavené hodnoty {value, qty}
 * @returns {HTMLDivElement}
 */
export function createRow(type, preset = { value: '', qty: '1' }) {
  const row = document.createElement('div');
  row.className = 'row';

  const select = document.createElement('select');
  select.name = `${type}[]`;

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '— vyber položku —';
  select.appendChild(placeholder);

  const opts = getOptionsFor(type);
  opts.forEach(({ value, text }) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = text;
    select.appendChild(opt);
  });
  if (preset && preset.value !== undefined) select.value = preset.value;

  const qty = document.createElement('input');
  qty.type = 'number';
  qty.min = '0';
  qty.placeholder = 'ks';
  qty.name = `${type}_qty[]`;
  qty.value = (preset && preset.qty != null) ? preset.qty : '1';

  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'icon-btn';
  del.title = 'Odebrat řádek';
  del.innerHTML = '<span class="icon">🗑</span>';
  del.addEventListener('click', () => {
    row.remove();
    if (scheduleSaveDraftFn) scheduleSaveDraftFn();
  });

  row.appendChild(select);
  row.appendChild(qty);
  row.appendChild(del);

  if (attachAutosaveListenersFn) attachAutosaveListenersFn(row);
  return row;
}

/**
 * Přidá nový řádek do sekce
 * @param {string} type - typ sekce
 * @param {Object} preset - přednastavené hodnoty
 */
export function addRow(type, preset) {
  const section = document.getElementById(type + 'Section');
  if (!section) return;
  const rows = section.querySelector('.rows');
  rows.appendChild(createRow(type, preset));
}

// === Default rows – vytvoří prázdný řádek v sekcích, pokud jsou prázdné ===========

/**
 * Zajistí, aby každá sekce měla alespoň jeden prázdný řádek
 */
export function ensureDefaultRows() {
  try {
    const defaults = [
      'plakety', 'chl', 'chl_pris', 'vh_hlavy', 'spojky', 'kohouty',
      'kohout_dily', 'narazec', 'odkapniky', 'plyn', 'hadice_python',
      'sanitace', 'vh_prisl', 'drzaky_desky', 'izolace', 'techno',
      'tank', 'ostatni', 'pulty'
    ];

    // Pokud byl načten JSON, nepřidávat default rows
    if (window.__jsonReloaded) return;

    defaults.forEach(type => {
      const section = document.getElementById(type + 'Section');
      if (!section) return;
      const rowsWrap = section.querySelector('.rows');
      if (!rowsWrap) return;
      if (rowsWrap.children.length === 0) {
        addRow(type, { value: '', qty: '1' });
      }
    });
  } catch (e) {
    console.warn('ensureDefaultRows error', e);
  }
}

// === SELECT FILTER – vyhledávání v dlouhých select elementech =======================

const norm = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Lazy getters pro hodnoty závislé na document (nespouštět při importu!)
let _isSK = null;
let _PH = null;

function getIsSK() {
  if (_isSK === null) {
    _isSK = (document?.documentElement?.dataset?.lang || 'cz') === 'sk';
  }
  return _isSK;
}

function getPH() {
  if (_PH === null) {
    _PH = getIsSK() ? 'hľadať…' : 'hledat…';
  }
  return _PH;
}

const templateCache = new Map();

/**
 * Načte všechny options pro daný typ (cache)
 */
function getAllOptionsFor(type) {
  if (templateCache.has(type)) return templateCache.get(type);
  const tpl = document.querySelector(`template[data-type="${type}"]`);
  if (!tpl) return [];
  const frag = tpl.content.cloneNode(true);
  const sel = frag.querySelector('select');
  const list = sel ? Array.from(sel.options).map(o => ({ value: o.value, text: o.textContent })) : [];
  templateCache.set(type, list);
  return list;
}

/**
 * Přestaví options v selectu podle filtru
 */
function rebuildSelectOptions(sel, opts, keepValue) {
  const prev = sel.value;
  sel.innerHTML = '';

  const ph = document.createElement('option');
  ph.value = '';
  ph.textContent = '— vyber položku —';
  sel.appendChild(ph);

  opts.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o.value;
    opt.textContent = o.text;
    sel.appendChild(opt);
  });

  if (keepValue && opts.some(o => o.value === prev)) {
    sel.value = prev;
  } else {
    sel.value = '';
  }

  if (sel.value !== prev) sel.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Zjistí typ sekce z name atributu selectu
 */
function typeFromSelect(sel) {
  const m = (sel.name || '').match(/^([a-z0-9_]+)\[\]$/i);
  return m ? m[1] : null;
}

/**
 * Přidá vyhledávací pole nad select
 * @param {HTMLSelectElement} sel
 */
export function enhanceSelect(sel) {
  if (sel.dataset.searchEnhanced === '1') return;
  const type = typeFromSelect(sel);
  if (!type) return;

  const full = getAllOptionsFor(type);
  if (!full.length) return;

  const wrap = document.createElement('div');
  wrap.className = 'select-filter-wrap';
  const input = document.createElement('input');
  input.className = 'select-filter';
  input.type = 'text';
  input.placeholder = (getIsSK() ? 'Začni ' : 'Začni ') + getPH();

  const tools = document.createElement('div');
  tools.className = 'select-filter-tools';
  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'select-filter-reset';
  resetBtn.textContent = getIsSK() ? 'Zrušiť filter' : 'Zrušit filtr';
  const count = document.createElement('span');
  count.className = 'select-filter-count';

  tools.appendChild(resetBtn);
  tools.appendChild(count);

  sel.parentNode.insertBefore(wrap, sel);
  wrap.appendChild(input);
  wrap.appendChild(tools);
  wrap.appendChild(sel);

  rebuildSelectOptions(sel, full, true);
  count.textContent = `${full.length} položek`;

  function applyFilter() {
    const q = norm(input.value);
    const filtered = q
      ? full.filter(o => norm(o.text).includes(q) || norm(o.value).includes(q))
      : full;
    rebuildSelectOptions(sel, filtered, true);
    count.textContent = `${filtered.length}/${full.length} položek`;
  }

  input.addEventListener('input', applyFilter);
  resetBtn.addEventListener('click', () => {
    input.value = '';
    applyFilter();
    try {
      sel.focus();
      sel.dispatchEvent(new MouseEvent('mousedown'));
    } catch (_) { }
  });

  sel.dataset.searchEnhanced = '1';
}

/**
 * Aplikuje enhancement na všechny selecty v daném root elementu
 * @param {HTMLElement} root
 */
export function enhanceAllIn(root) {
  root.querySelectorAll?.('select[name$="[]"]').forEach(enhanceSelect);
}

// === Inicializace mutation observeru pro nově přidané selecty ======================

/**
 * Inicializuje MutationObserver pro automatické enhancement nově přidaných selectů
 */
export function initSelectEnhancement() {
  enhanceAllIn(document);

  const mo = new MutationObserver(muts => {
    muts.forEach(m => {
      m.addedNodes.forEach(n => {
        if (!(n instanceof HTMLElement)) return;
        if (n.matches?.('select[name$="[]"]')) enhanceSelect(n);
        enhanceAllIn(n);
      });
    });
  });
  mo.observe(document.getElementById('formWrapper') || document.body, {
    childList: true,
    subtree: true
  });
}
