// ===================================================================================
// Module: form_draft.js
// Purpose: Ukládání, autosave a načtení rozpracovaných formulářů z localStorage
// ===================================================================================

import { setVal, addRow } from './ui_dynamicSections.js';

const LS_KEY = 'TS_FORM_DRAFT';
let __saveDraftTimer = null;

// === Sběr dat z formuláře pro draft ================================================

/**
 * Shromáždí všechna data z formuláře (hlavička, umístění, dohody, dynamické sekce)
 * @returns {Object}
 */
export function gatherDraftData() {
  const data = {};

  // === 1) HLAVIČKA ===
  ['sapId', 'nazevProvozovny', 'cisloTracku', 'pozadovanyDatum', 'adresaProvozovny', 'kontakt', 'vyplnilJmeno', 'vyplnilDatum']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) data[id] = el.value || '';
    });

  // === 2) UMÍSTĚNÍ ===
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

  // === 3) DOHODY ===
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

  // === 4) DYNAMICKÉ SEKCE ===
  const types = [
    'plakety', 'chl', 'chl_pris', 'vh_hlavy', 'kohouty', 'kohout_dily',
    'narazec', 'odkapniky', 'plyn', 'hadice_python', 'spojky', 'tesneni',
    'sanitace', 'vh_prisl', 'drzaky_desky', 'izolace', 'techno', 'tank',
    'ostatni', 'pulty'
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

// === Autosave do localStorage =======================================================

/**
 * Naplánuje uložení draftu s debounce (400ms)
 */
export function scheduleSaveDraft() {
  try {
    if (__saveDraftTimer) clearTimeout(__saveDraftTimer);
    __saveDraftTimer = setTimeout(() => {
      try {
        const draft = gatherDraftData();
        localStorage.setItem(LS_KEY, JSON.stringify({
          savedAt: new Date().toISOString(),
          data: draft
        }));
      } catch (e) {
        console.warn('Ukládání konceptu selhalo:', e);
      }
    }, 400);
  } catch (e) {
    console.warn('LocalStorage není dostupné:', e);
  }
}

/**
 * Připojí autosave listenery na všechny input/select/textarea v daném root elementu
 * @param {HTMLElement} root
 */
export function attachAutosaveListeners(root = document) {
  const controls = root.querySelectorAll('input, select, textarea');
  controls.forEach(el => {
    const isToggle = (el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'radio');
    el.addEventListener(isToggle ? 'change' : 'input', scheduleSaveDraft);
  });
}

// === Načtení draftu z localStorage ==================================================

/**
 * Načte draft z localStorage a aplikuje ho do formuláře (pokud uživatel chce)
 */
export function loadDraftIfAny() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw);
    const data = parsed?.data;
    if (!data) return;

    const wantsLoad = confirm("⚠️ Nalezen rozpracovaný formulář.\n\nOK = načíst, ZRUŠIT = smazat a začít znovu.");
    if (!wantsLoad) {
      clearDraft();
      return;
    }

    const someFilled = ['sapId', 'nazevProvozovny', 'cisloTracku', 'adresaProvozovny', 'kontakt', 'vyplnilJmeno']
      .some(id => (document.getElementById(id)?.value || '').trim() !== '');
    if (someFilled && !confirm("Formulář už má vyplněné hodnoty.\nChceš je přepsat uloženým konceptem?")) {
      return;
    }

    // === HLAVIČKA ===
    ['sapId', 'nazevProvozovny', 'cisloTracku', 'pozadovanyDatum', 'adresaProvozovny', 'pozadovanyDatum2', 'kontakt', 'vyplnilJmeno', 'vyplnilDatum']
      .forEach(id => {
        if (data[id] !== undefined) setVal(id, data[id]);
      });

    // === UMÍSTĚNÍ ===
    if (data.umisteni) {
      if (data.umisteni.ext_firma) {
        document.querySelector(`input[name="ext_firma"][value="${data.umisteni.ext_firma}"]`)?.click();
      }
      if (data.umisteni.keg_umisteni) {
        data.umisteni.keg_umisteni.forEach(v => {
          document.querySelector(`input[name="keg_umisteni"][value="${v}"]`)?.click();
        });
      }
      setVal('keg_poznamka', data.umisteni.keg_poznamka);

      if (data.umisteni.chl_umisteni) {
        data.umisteni.chl_umisteni.forEach(v => {
          document.querySelector(`input[name="chl_umisteni"][value="${v}"]`)?.click();
        });
      }
      setVal('chl_poznamka', data.umisteni.chl_poznamka);

      if (data.umisteni.typ_montaze) {
        data.umisteni.typ_montaze.forEach(v => {
          document.querySelector(`input[name="typ_montaze"][value="${v}"]`)?.click();
        });
      }
      setVal('typ_poznamka', data.umisteni.typ_poznamka);

      if (data.umisteni.km) {
        document.querySelector(`input[name="km"][value="${data.umisteni.km}"]`)?.click();
      }
      setVal('pocet_techniku', data.umisteni.pocet_techniku);
    }

    // === DOHODY ===
    if (data.dohody) {
      ['hlava_zasuvka', 'hlava_pracdeska', 'hlava_otvor', 'chl_zasuvka', 'chl_odvetrani', 'chl_podstavec',
       'sudy_voda', 'sudy_tlak', 'sudy_dochlazeni', 'stav_prurazy', 'stav_chranicka', 'stav_lanko', 'pokyny_vt']
        .forEach(f => {
          if (data.dohody[f]) {
            document.querySelector(`#dohodySection input[name="${f}"][value="${data.dohody[f]}"]`)?.click();
          }
        });

      if (Array.isArray(data.dohody.hlava_material)) {
        data.dohody.hlava_material.forEach(v => {
          document.querySelector(`#dohodySection input[name="hlava_material[]"][value="${v}"]`)?.click();
        });
      }

      const sudySel = document.getElementById('sudy_kulovy');
      if (sudySel && data.dohody.sudy_kulovy != null) {
        sudySel.value = data.dohody.sudy_kulovy;
      }

      setVal('hlava_material_jiny', data.dohody.hlava_material_jiny);
      setVal('hlava_poznamka', data.dohody.hlava_poznamka);
      setVal('chl_prostor_poznamka', data.dohody.chl_prostor_poznamka);
      setVal('sudy_poznamka', data.dohody.sudy_poznamka);
      setVal('stav_poznamka', data.dohody.stav_poznamka);
      setVal('dohody_poznamka', data.dohody.dohody_poznamka);
      setVal('demontaz_poznamky', data.dohody.demontaz_poznamky);

      if (Array.isArray(data.dohody.kofola)) {
        data.dohody.kofola.forEach(v => {
          document.querySelector(`#dohodySection input[name="kofola[]"][value="${v}"]`)?.click();
        });
      }
      setVal('kofola_poznamka', data.dohody.kofola_poznamka);
    }

    // === DYNAMICKÉ SEKCE ===
    const typesForLoad = [
      'plakety', 'chl', 'chl_pris', 'vh_hlavy', 'kohouty', 'kohout_dily',
      'narazec', 'odkapniky', 'plyn', 'hadice_python', 'spojky', 'tesneni',
      'sanitace', 'vh_prisl', 'drzaky_desky', 'izolace', 'techno', 'tank',
      'ostatni', 'pulty'
    ];

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

    // Označíme, že byl načten JSON/draft
    window.__jsonReloaded = true;
    window.__jsonReloadedTimestamp = new Date().toISOString().replace(/[:.]/g, '-');

    alert('Rozpracovaný formulář byl načten.');
  } catch (e) {
    console.warn('Načtení konceptu selhalo:', e);
  }
}

/**
 * Vymaže draft z localStorage
 */
export function clearDraft() {
  try {
    localStorage.removeItem(LS_KEY);
  } catch (e) {
    console.warn('Nelze vymazat draft:', e);
  }
}
