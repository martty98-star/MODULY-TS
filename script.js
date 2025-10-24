// ===================================================================================
// LASO – script.js (FIXES: dohody + typ_poznamka + načítání JSON/draft)
// ===================================================================================

// === Pomocné – načtení <option> šablon ============================================
function getOptionsFor(type) {
  const tpl = document.querySelector(`template[data-type="${type}"]`);
  if (!tpl) return [];
  const frag = tpl.content.cloneNode(true);
  const select = frag.querySelector('select');
  if (!select) return [];
  return Array.from(select.options).map(o => ({ value: o.value, text: o.textContent }));
}
function getFirstOptionValue(type) {
  const opts = getOptionsFor(type);
  const first = opts.find(o => (o.value || '').toString().trim() !== '');
  return first ? first.value : '';
}

// Globální bezpečný setter pro .value (nepadá, když prvek chybí)
function setVal(id, v) { const el = document.getElementById(id); if (el) el.value = v ?? ''; }

// === iOS detekce – nestahovat lokální soubory na iOS ================================
function isIOS() {
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isWebView = (window.webkit && window.webkit.messageHandlers) || /FBAN|FBAV|Instagram|Line\/|MicroMessenger|wv/.test(ua);
  return iOS && (isSafari || isWebView || true);
}

// === Továrna na řádky ===============================================================
function createRow(type, preset = { value: '', qty: '1' }) {
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
    scheduleSaveDraft();
  });

  row.appendChild(select);
  row.appendChild(qty);
  row.appendChild(del);

  attachAutosaveListeners(row);
  return row;
}

function addRow(type, preset) {
  const section = document.getElementById(type + 'Section');
  if (!section) return;
  const rows = section.querySelector('.rows');
  rows.appendChild(createRow(type, preset));
}

// ===================================================================================
// === LocalStorage draft =============================================================

const LS_KEY = 'TS_FORM_DRAFT';
let __saveDraftTimer = null;

function gatherDraftData() {
  const data = {};
  ['sapId','nazevProvozovny','cisloTracku','pozadovanyDatum','adresaProvozovny','kontakt','vyplnilJmeno','vyplnilDatum']
    .forEach(id => { const el = document.getElementById(id); if (el) data[id] = el.value || ''; });

  data['umisteni'] = {
    ext_firma: document.querySelector('input[name="ext_firma"]:checked')?.value || '',
    keg_umisteni: Array.from(document.querySelectorAll('input[name="keg_umisteni"]:checked')).map(el => el.value),
    keg_poznamka: document.getElementById('keg_poznamka')?.value || '',
    chl_umisteni: Array.from(document.querySelectorAll('input[name="chl_umisteni"]:checked')).map(el => el.value),
    chl_poznamka: document.getElementById('chl_poznamka')?.value || '',
    typ_montaze: Array.from(document.querySelectorAll('input[name="typ_montaze"]:checked')).map(el => el.value),
    typ_poznamka: document.getElementById('typ_poznamka')?.value || '',
    km: document.querySelector('input[name="km"]:checked')?.value || '',
    pocet_techniku: document.getElementById('pocet_techniku')?.value || ''
  };

  data['dohody'] = {
    hlava_zasuvka: document.querySelector('input[name="hlava_zasuvka"]:checked')?.value || '',
    hlava_pracdeska: document.querySelector('input[name="hlava_pracdeska"]:checked')?.value || '',
    hlava_otvor: document.querySelector('input[name="hlava_otvor"]:checked')?.value || '',
    // materiály jen z name="hlava_material[]"
    hlava_material: Array.from(document.querySelectorAll('#dohodySection input[name="hlava_material[]"]:checked')).map(el => el.value),
    hlava_material_jiny: document.getElementById('hlava_material_jiny')?.value || '',
    hlava_poznamka: document.getElementById('hlava_poznamka')?.value || '',

    chl_zasuvka: document.querySelector('input[name="chl_zasuvka"]:checked')?.value || '',
    chl_odvetrani: document.querySelector('input[name="chl_odvetrani"]:checked')?.value || '',
    chl_podstavec: document.querySelector('input[name="chl_podstavec"]:checked')?.value || '',
    chl_prostor_poznamka: document.getElementById('chl_prostor_poznamka')?.value || '',

    sudy_voda: document.querySelector('input[name="sudy_voda"]:checked')?.value || '',
    sudy_kulovy: document.getElementById('sudy_kulovy')?.value || '',
    sudy_tlak: document.querySelector('input[name="sudy_tlak"]:checked')?.value || '',
    sudy_dochlazeni: document.querySelector('input[name="sudy_dochlazeni"]:checked')?.value || '',
    sudy_poznamka: document.getElementById('sudy_poznamka')?.value || '',

    stav_prurazy: document.querySelector('input[name="stav_prurazy"]:checked')?.value || '',
    stav_chranicka: document.querySelector('input[name="stav_chranicka"]:checked')?.value || '',
    stav_lanko: document.querySelector('input[name="stav_lanko"]:checked')?.value || '',
    stav_poznamka: document.getElementById('stav_poznamka')?.value || '',

    dohody_poznamka: document.getElementById('dohody_poznamka')?.value || '',

    demontaz_poznamky: document.getElementById('demontaz_poznamky')?.value || '',

    kofola: Array.from(document.querySelectorAll('input[name="kofola[]"]:checked')).map(el => el.value),
    kofola_poznamka: document.getElementById('kofola_poznamka')?.value || '',
    pokyny_vt: document.querySelector('input[name="pokyny_vt"]:checked')?.value || ''
  };

  const types = [
    'plakety','chl','chl_pris','vh_hlavy','kohouty','kohout_dily',
    'narazec','odkapniky','plyn','hadice_python','spojky','tesneni',
    'sanitace','vh_prisl','drzaky_desky','izolace','techno','tank',
    'ostatni','pulty'
  ];

  types.forEach(type => {
    const section = document.getElementById(type + 'Section');
    if (!section) return;
    const rows = Array.from(section.querySelectorAll('.row'));
    const arr = [];
    rows.forEach(r => {
      const sel = r.querySelector(`select[name="${type}[]"]`);
      const qty = r.querySelector(`input[name="${type}_qty[]"]`);
      if (!sel) return;
      if ((sel.value && sel.value !== '') || (qty && qty.value)) {
        arr.push({ value: sel.value || '', qty: qty?.value || '' });
      }
    });
    data[type] = arr;
    const note = document.getElementById(`pozn_${type}`);
    if (note) data[`pozn_${type}`] = note.value || '';
  });

  return data;
}

function scheduleSaveDraft() {
  try {
    if (__saveDraftTimer) clearTimeout(__saveDraftTimer);
    __saveDraftTimer = setTimeout(() => {
      try {
        const draft = gatherDraftData();
        localStorage.setItem(LS_KEY, JSON.stringify({ savedAt: new Date().toISOString(), data: draft }));
      } catch (e) { console.warn('Ukládání konceptu selhalo:', e); }
    }, 400);
  } catch (e) { console.warn('LocalStorage není dostupné:', e); }
}
function attachAutosaveListeners(root = document) {
  const controls = root.querySelectorAll('input, select, textarea');
  controls.forEach(el => {
    const isToggle = (el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'radio');
    el.addEventListener(isToggle ? 'change' : 'input', scheduleSaveDraft);
  });
}
function loadDraftIfAny() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const data = parsed?.data;
    if (!data) return;

    const wantsLoad = confirm("⚠️ Nalezen rozpracovaný formulář.\n\nOK = načíst, ZRUŠIT = smazat a začít znovu.");
    if (!wantsLoad) { clearDraft(); return; }

    const someFilled = ['sapId', 'nazevProvozovny', 'cisloTracku', 'adresaProvozovny', 'kontakt', 'vyplnilJmeno']
      .some(id => (document.getElementById(id)?.value || '').trim() !== '');
    if (someFilled && !confirm("Formulář už má vyplněné hodnoty.\nChceš je přepsat uloženým konceptem?")) return;

    (['sapId', 'nazevProvozovny', 'cisloTracku', 'pozadovanyDatum', 'adresaProvozovny', 'pozadovanyDatum2', 'kontakt', 'vyplnilJmeno', 'vyplnilDatum'])
      .forEach(id => {
        if (data[id] !== undefined) setVal(id, data[id]);
      });

    if (data.umisteni) {
      if (data.umisteni.ext_firma) document.querySelector(`input[name="ext_firma"][value="${data.umisteni.ext_firma}"]`)?.click();
      if (data.umisteni.keg_umisteni) data.umisteni.keg_umisteni.forEach(v => document.querySelector(`input[name="keg_umisteni"][value="${v}"]`)?.click());
      setVal('keg_poznamka', data.umisteni.keg_poznamka);
      if (data.umisteni.chl_umisteni) data.umisteni.chl_umisteni.forEach(v => document.querySelector(`input[name="chl_umisteni"][value="${v}"]`)?.click());
      setVal('chl_poznamka', data.umisteni.chl_poznamka);
      if (data.umisteni.typ_montaze) data.umisteni.typ_montaze.forEach(v => document.querySelector(`input[name="typ_montaze"][value="${v}"]`)?.click());
      setVal('typ_poznamka', data.umisteni.typ_poznamka);
      if (data.umisteni.km) document.querySelector(`input[name="km"][value="${data.umisteni.km}"]`)?.click();
      setVal('pocet_techniku', data.umisteni.pocet_techniku);
    }

    if (data.dohody) {
      ['hlava_zasuvka', 'hlava_pracdeska', 'hlava_otvor', 'chl_zasuvka', 'chl_odvetrani', 'chl_podstavec',
       'sudy_voda', 'sudy_tlak', 'sudy_dochlazeni', 'stav_prurazy', 'stav_chranicka', 'stav_lanko', 'pokyny_vt']
        .forEach(f => {
          if (data.dohody[f]) document.querySelector(`#dohodySection input[name="${f}"][value="${data.dohody[f]}"]`)?.click();
        });

      if (Array.isArray(data.dohody.hlava_material)) {
        data.dohody.hlava_material.forEach(v => document.querySelector(`#dohodySection input[name="hlava_material[]"][value="${v}"]`)?.click());
      }

      const sudySel = document.getElementById('sudy_kulovy');
      if (sudySel && data.dohody.sudy_kulovy != null) sudySel.value = data.dohody.sudy_kulovy;

      setVal('chl_prostor_poznamka', data.dohody.chl_prostor_poznamka);
      setVal('sudy_poznamka', data.dohody.sudy_poznamka);
      setVal('stav_poznamka', data.dohody.stav_poznamka);
      setVal('dohody_poznamka', data.dohody.dohody_poznamka);

      if (Array.isArray(data.dohody.kofola)) {
        data.dohody.kofola.forEach(v => document.querySelector(`#dohodySection input[name="kofola[]"][value="${v}"]`)?.click());
      }
      setVal('kofola_poznamka', data.dohody.kofola_poznamka);
    }

    const typesForLoad = ['plakety', 'chl', 'chl_pris', 'vh_hlavy', 'kohouty', 'kohout_dily', 'narazec', 'odkapniky', 'plyn', 'hadice_python', 'spojky', 'tesneni', 'sanitace', 'vh_prisl', 'drzaky_desky', 'izolace', 'techno', 'tank', 'ostatni', 'pulty'];
    typesForLoad.forEach(type => {
      const section = document.getElementById(type + 'Section');
      if (!section) return;
      const rowsWrap = section.querySelector('.rows');
      rowsWrap.innerHTML = '';
      const arr = Array.isArray(data[type]) ? data[type] : [];
      arr.forEach(item => addRow(type, { value: item.value ?? '', qty: item.qty ?? '' }));
      if (data['pozn_' + type]) {
        const note = document.getElementById('pozn_' + type);
        if (note) note.value = data['pozn_' + type];
      }
    });

    window.__jsonReloaded = true;
    window.__jsonReloadedTimestamp = new Date().toISOString().replace(/[:.]/g, '-');

    alert('Rozpracovaný formulář byl načten.');
  } catch (e) { console.warn('Načtení konceptu selhalo:', e); }
}

function clearDraft() { try { localStorage.removeItem(LS_KEY); } catch (e) {} }

// ===================================================================================
// === OFFLINE QUEUE (beze změn) =====================================================
const QUEUE_KEY = 'TS_SEND_QUEUE_V1';
function getSendQueue() { try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return []; } }
function setSendQueue(q) { try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch {} }
function enqueueRequest(task) { const q = getSendQueue(); q.push({ ...task, queuedAt: new Date().toISOString() }); setSendQueue(q); }
async function trySendTask(task) {
  const { url, body, headers } = task;
  const resp = await fetch(url, { method: 'POST', headers: headers || { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
}
async function processSendQueue() {
  if (!navigator.onLine) return;
  const q = getSendQueue();
  if (!q.length) return;
  const remaining = [];
  for (const task of q) {
    try { await trySendTask(task); } catch (e) { remaining.push(task); }
  }
  setSendQueue(remaining);
  if (q.length && remaining.length === 0) { alert('Byli jste zpět online – všechny čekající položky byly úspěšně odeslány.'); }
}
window.addEventListener('online', processSendQueue);
async function safePostOrQueue(url, body, headers) {
  const doEnqueue = () => { enqueueRequest({ url, body, headers }); alert('Nejste online nebo je dočasný výpadek připojení. Úloha byla uložena a po připojení ji odešlu automaticky.'); return { queued: true }; };
  if (!navigator.onLine) return doEnqueue();
  try {
    const resp = await fetch(url, { method: 'POST', headers: headers || { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return { ok: true };
  } catch (e) { return doEnqueue(); }
}

// ===================================================================================
// === Uložení / export (JSON + CSV) – BEZ LOKÁLNÍHO STAŽENÍ =========================
// ===================================================================================
async function ulozitData() {
  const data = {};

  // --- 1) HLAVIČKA FORMULÁŘE ---
  ['sapId','nazevProvozovny','cisloTracku','pozadovanyDatum','adresaProvozovny','kontakt','vyplnilJmeno','vyplnilDatum']
    .forEach(id => { const el = document.getElementById(id); if (el) data[id] = el.value || ''; });

  // --- 2) UMÍSTĚNÍ ---
  data['umisteni'] = {
    ext_firma: document.querySelector('input[name="ext_firma"]:checked')?.value || '',
    keg_umisteni: Array.from(document.querySelectorAll('input[name="keg_umisteni"]:checked')).map(el => el.value),
    keg_poznamka: document.getElementById('keg_poznamka')?.value || '',
    chl_umisteni: Array.from(document.querySelectorAll('input[name="chl_umisteni"]:checked')).map(el => el.value),
    chl_poznamka: document.getElementById('chl_poznamka')?.value || '',
    typ_montaze: Array.from(document.querySelectorAll('input[name="typ_montaze"]:checked')).map(el => el.value),
    typ_poznamka: document.getElementById('typ_poznamka')?.value || '',
    km: document.querySelector('input[name="km"]:checked')?.value || '',
    pocet_techniku: document.getElementById('pocet_techniku')?.value || ''
  };

  // --- 3) DOHODY ---
  data['dohody'] = {
    hlava_zasuvka: document.querySelector('input[name="hlava_zasuvka"]:checked')?.value || '',
    hlava_pracdeska: document.querySelector('input[name="hlava_pracdeska"]:checked')?.value || '',
    hlava_otvor: document.querySelector('input[name="hlava_otvor"]:checked')?.value || '',
    hlava_material: Array.from(document.querySelectorAll('#dohodySection input[name="hlava_material[]"]:checked')).map(el => el.value),
    hlava_material_jiny: document.getElementById('hlava_material_jiny')?.value || '',
    hlava_poznamka: document.getElementById('hlava_poznamka')?.value || '',

    chl_zasuvka: document.querySelector('input[name="chl_zasuvka"]:checked')?.value || '',
    chl_odvetrani: document.querySelector('input[name="chl_odvetrani"]:checked')?.value || '',
    chl_podstavec: document.querySelector('input[name="chl_podstavec"]:checked')?.value || '',
    chl_prostor_poznamka: document.getElementById('chl_prostor_poznamka')?.value || '',

    sudy_voda: document.querySelector('input[name="sudy_voda"]:checked')?.value || '',
    sudy_kulovy: document.getElementById('sudy_kulovy')?.value || '',
    sudy_tlak: document.querySelector('input[name="sudy_tlak"]:checked')?.value || '',
    sudy_dochlazeni: document.querySelector('input[name="sudy_dochlazeni"]:checked')?.value || '',
    sudy_poznamka: document.getElementById('sudy_poznamka')?.value || '',

    stav_prurazy: document.querySelector('input[name="stav_prurazy"]:checked')?.value || '',
    stav_chranicka: document.querySelector('input[name="stav_chranicka"]:checked')?.value || '',
    stav_lanko: document.querySelector('input[name="stav_lanko"]:checked')?.value || '',
    stav_poznamka: document.getElementById('stav_poznamka')?.value || '',

    dohody_poznamka: document.getElementById('dohody_poznamka')?.value || '',
    demontaz_poznamky: document.getElementById('demontaz_poznamky')?.value || '',

    kofola: Array.from(document.querySelectorAll('input[name="kofola[]"]:checked')).map(el => el.value),
    kofola_poznamka: document.getElementById('kofola_poznamka')?.value || '',
    pokyny_vt: document.querySelector('input[name="pokyny_vt"]:checked')?.value || ''
  };

  // --- 4) DYNAMICKÉ SEKCE (včetně PULTY) ---
  const types = [
    'plakety','chl','chl_pris','vh_hlavy','kohouty','kohout_dily',
    'narazec','odkapniky','plyn','hadice_python','spojky','tesneni',
    'sanitace','vh_prisl','drzaky_desky','izolace','techno','tank',
    'ostatni','pulty'
  ];

  types.forEach(type => {
    const section = document.getElementById(type + 'Section');
    if (!section) return;
    const rows = Array.from(section.querySelectorAll('.row'));
    const arr = [];
    rows.forEach(r => {
      const sel = r.querySelector(`select[name="${type}[]"]`);
      const qty = r.querySelector(`input[name="${type}_qty[]"]`);
      if (!sel) return;
      if ((sel.value && sel.value !== '') || (qty && qty.value)) {
        arr.push({ value: sel.value || '', qty: qty?.value || '' });
      }
    });
    data[type] = arr;
    const note = document.getElementById(`pozn_${type}`);
    if (note) data[`pozn_${type}`] = note.value || '';
  });

  // --- 5) METADATA A NÁZVY SOUBORŮ ---
  const sapId = data.sapId || 'SAP';
  const provozovna = (data.nazevProvozovny || 'PROVOZOVNA').replace(/\s+/g, '_');
  const track = data.cisloTracku || 'TRACK';
  const vyplnil = (document.getElementById('vyplnilJmeno')?.value || 'NEURCENO').replace(/\s+/g, '_');

  const editedAtISO = new Date().toISOString();
  const technikVal = document.getElementById('vyplnilJmeno')?.value || 'NEURCENO';
  const dataToSend = { ...data, editedAt: editedAtISO, technik: technikVal };

  // název JSON
  let jsonFileName = `${sapId}_${provozovna}_${track}_${vyplnil}.json`;
  if (window.__jsonReloaded) {
    const ts = (window.__jsonReloadedTimestamp || new Date().toISOString().replace(/[:.]/g, '-'));
    jsonFileName = `${sapId}_${provozovna}_${track}_EDITOVANO_${ts}.json`;
    dataToSend.__editedSuffix = `_EDITOVANO_${ts}`;
  }

  // (VYPNUTO) LOKÁLNÍ STAŽENÍ JSON – žádné Blob/anchor stahování

  // --- 7) ODESLÁNÍ JSON DO PA ---
  try {
    const jsonString = JSON.stringify(dataToSend);
    const jsonBase64 = btoa(unescape(encodeURIComponent(jsonString)));

    const jsonEndpoint = 'https://prod-157.westeurope.logic.azure.com:443/workflows/4a8bffd5dd524cbea14785efbb24374e/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=UKmCEwi9xhkYFyM8IqZ-MmTb3dvEIc573YIgAragfOA';

    const res = await safePostOrQueue(jsonEndpoint, {
      jsonFileName: jsonFileName,
      jsonContent: jsonBase64
    }, { 'Content-Type': 'application/json' });

    if (res && res.ok) {
      alert('Soubor JSON byl odeslán do Power Automate.');
      clearDraft();
    }
    // Pokud je to queued (offline), hlášku řeší safePostOrQueue.
  } catch (err) {
    console.warn('Odeslání JSON do PA selhalo:', err);
    alert('Online uložení JSON selhalo.');
  }

  // --- 8) CSV EXPORT + UPLOAD (bez lokálního stažení) ---
  try {
    await exportJsonToCsvAndUpload(dataToSend);
  } catch (err) {
    console.warn('CSV export/odeslání selhalo:', err);
    alert('CSV export/odeslání selhalo.');
  }
}

// === Načítání JSON souboru přes „Načíst data“ ======================================

const jsonInputEl = document.getElementById('jsonInput');
if (jsonInputEl) {
  jsonInputEl.addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);

        (['sapId','nazevProvozovny','cisloTracku','pozadovanyDatum','adresaProvozovny','pozadovanyDatum2','kontakt','vyplnilJmeno','vyplnilDatum'])
          .forEach(id => { if (data[id] !== undefined) setVal(id, data[id]); });

        if (data.umisteni) {
          if (data.umisteni.ext_firma) document.querySelector(`input[name="ext_firma"][value="${data.umisteni.ext_firma}"]`)?.click();
          (data.umisteni.keg_umisteni || []).forEach(v => document.querySelector(`input[name="keg_umisteni"][value="${v}"]`)?.click());
          setVal('keg_poznamka', data.umisteni.keg_poznamka);
          (data.umisteni.chl_umisteni || []).forEach(v => document.querySelector(`input[name="chl_umisteni"][value="${v}"]`)?.click());
          setVal('chl_poznamka', data.umisteni.chl_poznamka);
          (data.umisteni.typ_montaze || []).forEach(v => document.querySelector(`input[name="typ_montaze"][value="${v}"]`)?.click());
          setVal('typ_poznamka', data.umisteni.typ_poznamka);
          if (data.umisteni.km) document.querySelector(`input[name="km"][value="${data.umisteni.km}"]`)?.click();
          setVal('pocet_techniku', data.umisteni.pocet_techniku);
        }

        if (data.dohody) {
          ['hlava_zasuvka','hlava_pracdeska','hlava_otvor','chl_zasuvka','chl_odvetrani','chl_podstavec','sudy_voda','sudy_tlak','sudy_dochlazeni','stav_prurazy','stav_chranicka','stav_lanko','pokyny_vt']
            .forEach(f => { if (data.dohody[f]) document.querySelector(`#dohodySection input[name="${f}"][value="${data.dohody[f]}"]`)?.click(); });

          (data.dohody.hlava_material || []).forEach(v => document.querySelector(`#dohodySection input[name="hlava_material[]"][value="${v}"]`)?.click());
          setVal('hlava_material_jiny', data.dohody.hlava_material_jiny);
          setVal('hlava_poznamka', data.dohody.hlava_poznamka);

          const sudySel = document.getElementById('sudy_kulovy');
          if (sudySel && data.dohody.sudy_kulovy != null) sudySel.value = data.dohody.sudy_kulovy;

          setVal('chl_prostor_poznamka', data.dohody.chl_prostor_poznamka);
          setVal('sudy_poznamka', data.dohody.sudy_poznamka);
          setVal('stav_poznamka', data.dohody.stav_poznamka);
          setVal('dohody_poznamka', data.dohody.dohody_poznamka);

          (data.dohody.kofola || []).forEach(v => document.querySelector(`#dohodySection input[name="kofola[]"][value="${v}"]`)?.click());
          setVal('kofola_poznamka', data.dohody.kofola_poznamka);

          // 7) Demontáž VT
          setVal('demontaz_poznamky', data.dohody.demontaz_poznamky);
        }

        // dynamické sekce (včetně PULTŮ)
        const types = [
          'plakety','chl','chl_pris','vh_hlavy','kohouty','kohout_dily',
          'narazec','odkapniky','plyn','hadice_python','spojky','tesneni',
          'sanitace','vh_prisl','drzaky_desky','izolace','techno','tank',
          'ostatni','pulty'
        ];
        types.forEach(type => {
          const section = document.getElementById(type + 'Section');
          if (!section) return;
          const rowsWrap = section.querySelector('.rows');
          rowsWrap.innerHTML = '';
          const arr = Array.isArray(data[type]) ? data[type] : [];
          arr.forEach(item => addRow(type, { value: item.value ?? '', qty: item.qty ?? '' }));
          if (data['pozn_' + type]) {
            const note = document.getElementById('pozn_' + type);
            if (note) note.value = data['pozn_' + type];
          }
        });

        window.__jsonReloaded = true;
        window.__jsonReloadedTimestamp = new Date().toISOString().replace(/[:.]/g, '-');

        alert('JSON byl načten.');
      } catch (err) {
        alert('Chyba při načítání JSON: ' + (err.message || err));
      }
    };
    reader.readAsText(file);
  });
}

// === Předvyplnění z URL + init =====================================================

function setIfExists(id, value) { const el = document.getElementById(id); if (el && value != null) el.value = value; }
window.addEventListener('DOMContentLoaded', () => {
  const q = new URLSearchParams(window.location.search);
  setIfExists('sapId', q.get('sapId'));
  setIfExists('nazevProvozovny', q.get('nazevProvozovny'));
  setIfExists('cisloTracku', q.get('cisloTracku'));
  setIfExists('pozadovanyDatum', q.get('datum'));
  setIfExists('adresaProvozovny', q.get('adresa'));
  setIfExists('kontakt', q.get('kontakt'));

  attachAutosaveListeners(document);
  try { enhanceAllIn(document); } catch (e) {}
  loadDraftIfAny();
  try { ensureDefaultRows(); } catch (e) {}

  const pv = document.getElementById('pivniVedeni');
  if (pv) {
    pv.addEventListener('change', function () {
      const val = parseInt(this.value, 10);
      if (!isNaN(val)) autoFillSpojky(val);
    });
    const initial = parseInt(pv.value, 10);
    if (!isNaN(initial) && initial > 0) setTimeout(() => autoFillSpojky(initial), 50);
  }

  const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.getAttribute('onclick') && b.getAttribute('onclick').includes('ulozitData'));
  if (saveBtn) saveBtn.disabled = false;

  processSendQueue();
});

// === AutoFill SPOJKY ===============================================================

function autoFillSpojky(pocetVedení) {
  const spojkyTabulka = {
    1: { 'PN580003132': 7,  'PN580003227': 1, 'PN580003143': 3  },
    2: { 'PN580003132': 8,  'PN580003227': 2, 'PN580003143': 4  },
    3: { 'PN580003132': 11, 'PN580003227': 3, 'PN580003143': 5  },
    4: { 'PN580003132': 14, 'PN580003227': 4, 'PN580003143': 6  },
    5: { 'PN580003132': 17, 'PN580003227': 5, 'PN580003143': 7  },
    6: { 'PN580003132': 20, 'PN580003227': 6, 'PN580003143': 8  },
    8: { 'PN580003132': 28, 'PN580003227': 8, 'PN580003143': 10 }
  };
  const vybrane = spojkyTabulka[pocetVedení];
  if (!vybrane) return;
  const spojkyRows = document.querySelector('#spojkySection .rows');
  if (!spojkyRows) return;
  spojkyRows.innerHTML = '';
  Object.entries(vybrane).forEach(([kod, qty]) => addRow('spojky', { value: kod, qty }));
  try { enhanceAllIn(spojkyRows); } catch (e) {}
  scheduleSaveDraft();
}

// === Default rows ==================================================================

function ensureDefaultRows() {
  try {
    const defaults = ['plakety', 'chl', 'chl_pris', 'vh_hlavy', 'spojky', 'kohouty', 'kohout_dily', 'narazec', 'odkapniky', 'plyn', 'hadice_python', 'sanitace', 'vh_prisl', 'drzaky_desky', 'izolace', 'techno', 'tank', 'ostatni', 'pulty'];
    if (window.__jsonReloaded) return;
    defaults.forEach(type => {
      const section = document.getElementById(type + 'Section');
      if (!section) return;
      const rowsWrap = section.querySelector('.rows');
      if (!rowsWrap) return;
      if (rowsWrap.children.length === 0) addRow(type, { value: '', qty: '1' });
    });
  } catch (e) { console.warn('ensureDefaultRows error', e); }
}

// ===================================================================================
// === FUNKCE PRO EXPORT DO CSV ======================================================
// ===================================================================================

function buildProductMapFromTemplates() {
  const map = {};
  document.querySelectorAll('template[data-type]').forEach(tpl => {
    const frag = tpl.content.cloneNode(true);
    const sel = frag.querySelector('select');
    if (!sel) return;
    for (const opt of sel.options) {
      const text = (opt.textContent || '').trim();
      const val = (opt.value || '').trim();
      if (!val && !text) continue;
      const code = val || (text.split('—')[0] || text.split(' ')[0]).trim();
      if (code) map[code] = text;
    }
  });
  return map;
}

function collectLineItemsFromJson(json) {
  const types = ['plakety', 'chl', 'chl_pris', 'vh_hlavy', 'kohouty', 'kohout_dily',
    'narazec', 'odkapniky', 'plyn', 'hadice_python', 'spojky', 'tesneni',
    'sanitace', 'vh_prisl', 'drzaky_desky', 'izolace', 'techno', 'tank', 'ostatni', 'pulty'];
  const rows = [];
  types.forEach(type => {
    const arr = Array.isArray(json[type]) ? json[type] : [];
    arr.forEach(it => {
      const code = (it.value || '').toString().trim();
      const qty = (it.qty || '').toString().trim() || '';
      if (code || qty) rows.push({ section: type, code, qty });
    });
  });
  return rows;
}

function csvEscapeField(value) {
  if (value === null || value === undefined) return '""';
  const s = value.toString();
  return '"' + s.replace(/"/g, '""') + '"';
}

function generateCsvFromJson(json) {
  const meta = {
    SAP: json.sapId || '',
    Provozovna: json.nazevProvozovny || '',
    Track: json.cisloTracku || '',
    Vyplnil: json.vyplnilJmeno || '',
    Datum: json.vyplnilDatum || (new Date()).toISOString().split('T')[0]
  };

  const prodMap = buildProductMapFromTemplates();
  const items = collectLineItemsFromJson(json);

  const delim = ';';
  const lines = [];

  lines.push(['SAP', 'Provozovna', 'Track', 'Vyplnil', 'Datum'].map(csvEscapeField).join(delim));
  lines.push([meta.SAP, meta.Provozovna, meta.Track, meta.Vyplnil, meta.Datum].map(csvEscapeField).join(delim));
  lines.push('');

  lines.push(['SAP POLOŽKY', 'QTY (POČET)', 'NÁZEV', 'TYP POLOŽKY'].map(csvEscapeField).join(delim));

  items.forEach(it => {
    const name = prodMap[it.code] || '';
    lines.push([it.code, it.qty, name, it.section].map(csvEscapeField).join(delim));
  });

  const csv = '\uFEFF' + lines.join('\r\n');
  const base64 = btoa(unescape(encodeURIComponent(csv)));
  return { csvText: csv, base64 };
}

/**
 * Lokální stažení CSV je vypnuto – CSV se pouze odešle do Power Automate.
 */
function downloadBase64AsCsvFile(base64, filename) {
  // Úmyslně vypnuto – žádné lokální stahování, žádný a.href.
  console.log(`(downloadBase64AsCsvFile vypnuto) Soubor ${filename} nebyl stažen lokálně.`);
  return;
}

async function uploadCsvToPA(base64content, filename) {
  const endpoint = 'https://prod-12.westeurope.logic.azure.com:443/workflows/8ce6b0dd923e4de1b4568ed89bbfdb63/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=LEw2JNM_ZEqsJcnm_Ap7OTKbDW9RnOFF1UKbgCDKO24';
  const body = {
    csvFileName: filename,
    csvContent: base64content
  };

  // [OFFLINE QUEUE] bezpečné odeslání CSV
  return safePostOrQueue(endpoint, body, { 'Content-Type': 'application/json' });
}

async function exportJsonToCsvAndUpload(json) {
  try {
    const { csvText, base64 } = generateCsvFromJson(json);
    const sap = (json.sapId || 'SAP').toString();
    const provoz = ((json.nazevProvozovny || 'PROVOZOVNA').replace(/\s+/g, '_')).toString();
    const track = (json.cisloTracku || 'TRACK').toString();
    const vyplnil = ((json.vyplnilJmeno || 'NEURCENO').replace(/\s+/g, '_')).toString();
    let fileName = `${sap}_${provoz}_${track}_${vyplnil}.csv`;

    if (json.__editedSuffix) {
      fileName = `${sap}_${provoz}_${track}${json.__editedSuffix}.csv`;
    }

    downloadBase64AsCsvFile(base64, fileName); // no-op

    try {
      const r = await uploadCsvToPA(base64, fileName);
      if (r && r.ok) {
        alert('CSV bylo odesláno do Power Automate / SharePoint.');
      }
      // pokud je to jen queued, už jsme hlášku zobrazili v safePostOrQueue
    } catch (err) {
      console.warn('Upload CSV do PA selhal:', err);
      alert('CSV export OK, ale upload do PA selhal: ' + (err.message || err));
    }
  } catch (err) {
    console.error('Chyba při vytváření CSV:', err);
    alert('Chyba při vytváření CSV: ' + (err.message || err));
  }
}

// === Select filter (vyhledávání v <select>) ========================================
(function () {
  const norm = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const isSK = (document.documentElement.dataset.lang || 'cz') === 'sk';
  const PH = isSK ? 'hľadať…' : 'hledat…';

  function typeFromSelect(sel) {
    const m = (sel.name || '').match(/^([a-z0-9_]+)\[\]$/i);
    return m ? m[1] : null;
  }

  const templateCache = new Map();
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

  function enhanceSelect(sel) {
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
    input.placeholder = (isSK ? 'Začni ' : 'Začni ') + PH;

    const tools = document.createElement('div');
    tools.className = 'select-filter-tools';
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'select-filter-reset';
    resetBtn.textContent = isSK ? 'Zrušiť filter' : 'Zrušit filtr';
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
      try { sel.focus(); sel.dispatchEvent(new MouseEvent('mousedown')); } catch (_) { }
    });

    sel.dataset.searchEnhanced = '1';
  }

  function enhanceAllIn(root) {
    root.querySelectorAll?.('select[name$="[]"]').forEach(enhanceSelect);
  }

  document.addEventListener('DOMContentLoaded', () => {
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
    mo.observe(document.getElementById('formWrapper') || document.body, { childList: true, subtree: true });
  });
})();
