// ===================================================================================
// Module: deeplink.js
// Purpose: Generování a načítání deeplinků pro předvyplnění celého formuláře
// ===================================================================================

import { gatherDraftData } from './form_draft.js';
import { setVal, addRow } from './ui_dynamicSections.js';

// URL parametr pro deeplink data
const DEEPLINK_PARAM = 'data';

// === Encoding / Decoding ============================================================

/**
 * Zakóduje data formuláře do Base64 URL-safe stringu
 * @param {Object} data - data formuláře (výstup z gatherDraftData)
 * @returns {string} Base64 URL-safe string
 */
function encodeFormData(data) {
  try {
    const jsonString = JSON.stringify(data);
    const base64 = btoa(unescape(encodeURIComponent(jsonString)));
    // URL-safe Base64 (nahradit +/= znaky)
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  } catch (e) {
    console.error('Encoding selhalo:', e);
    throw new Error('Nepodařilo se zakódovat data formuláře');
  }
}

/**
 * Dekóduje Base64 URL-safe string zpět na data formuláře
 * @param {string} encoded - Base64 URL-safe string
 * @returns {Object} data formuláře
 */
function decodeFormData(encoded) {
  try {
    // Převést zpět z URL-safe Base64
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    // Doplnit padding
    while (base64.length % 4) {
      base64 += '=';
    }
    const jsonString = decodeURIComponent(escape(atob(base64)));
    return JSON.parse(jsonString);
  } catch (e) {
    console.error('Decoding selhal:', e);
    throw new Error('Nepodařilo se dekódovat data z odkazu');
  }
}

// === Generování deeplinku ===========================================================

/**
 * Vygeneruje deeplink s aktuálními daty formuláře
 * @returns {string} Kompletní URL s deeplink parametrem
 */
export function generateDeeplink() {
  const data = gatherDraftData();

  // Validace - zkontrolovat, že formulář má nějaká data
  const hasData = data.sapId || data.nazevProvozovny || data.cisloTracku;
  if (!hasData) {
    throw new Error('Formulář je prázdný - nejsou žádná data ke sdílení');
  }

  const encoded = encodeFormData(data);
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}?${DEEPLINK_PARAM}=${encoded}`;
}

/**
 * Zkopíruje deeplink do schránky
 * @returns {Promise<string>} URL deeplinku
 */
export async function copyDeeplinkToClipboard() {
  try {
    const deeplink = generateDeeplink();

    // Pokusit se použít Clipboard API (moderní prohlížeče)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(deeplink);
      alert('✅ Odkaz zkopírován do schránky!\n\nMůžeš ho poslat kolegovi nebo si ho uložit.');
      return deeplink;
    }

    // Fallback pro starší prohlížeče
    const textarea = document.createElement('textarea');
    textarea.value = deeplink;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);

    alert('✅ Odkaz zkopírován do schránky!\n\nMůžeš ho poslat kolegovi nebo si ho uložit.');
    return deeplink;
  } catch (err) {
    console.error('Kopírování selhalo:', err);

    // Pokud selže kopírování, ukázat odkaz v alertu
    try {
      const deeplink = generateDeeplink();
      const shortened = deeplink.length > 100
        ? deeplink.substring(0, 100) + '...'
        : deeplink;
      prompt('Odkaz se nepodařilo zkopírovat automaticky. Zkopíruj ho ručně:', deeplink);
      return deeplink;
    } catch (e) {
      alert('❌ Chyba: ' + (err.message || 'Nepodařilo se vytvořit odkaz'));
      throw err;
    }
  }
}

// === Načtení z deeplinku ============================================================

/**
 * Aplikuje data do formuláře (stejná logika jako JSON import)
 * @param {Object} data - data formuláře
 */
function applyDataToForm(data) {
  // === 1) HLAVIČKA ===
  ['sapId', 'nazevProvozovny', 'cisloTracku', 'pozadovanyDatum', 'adresaProvozovny',
   'pozadovanyDatum2', 'kontakt', 'vyplnilJmeno', 'vyplnilDatum']
    .forEach(id => {
      if (data[id] !== undefined) setVal(id, data[id]);
    });

  // === 2) UMÍSTĚNÍ ===
  if (data.umisteni) {
    if (data.umisteni.ext_firma) {
      document.querySelector(`input[name="ext_firma"][value="${data.umisteni.ext_firma}"]`)?.click();
    }
    (data.umisteni.keg_umisteni || []).forEach(v => {
      document.querySelector(`input[name="keg_umisteni"][value="${v}"]`)?.click();
    });
    setVal('keg_poznamka', data.umisteni.keg_poznamka);

    (data.umisteni.chl_umisteni || []).forEach(v => {
      document.querySelector(`input[name="chl_umisteni"][value="${v}"]`)?.click();
    });
    setVal('chl_poznamka', data.umisteni.chl_poznamka);

    (data.umisteni.typ_montaze || []).forEach(v => {
      document.querySelector(`input[name="typ_montaze"][value="${v}"]`)?.click();
    });
    setVal('typ_poznamka', data.umisteni.typ_poznamka);

    if (data.umisteni.km) {
      document.querySelector(`input[name="km"][value="${data.umisteni.km}"]`)?.click();
    }
    setVal('pocet_techniku', data.umisteni.pocet_techniku);
  }

  // === 3) DOHODY ===
  if (data.dohody) {
    ['hlava_zasuvka', 'hlava_pracdeska', 'hlava_otvor', 'chl_zasuvka', 'chl_odvetrani',
     'chl_podstavec', 'sudy_voda', 'sudy_tlak', 'sudy_dochlazeni', 'stav_prurazy',
     'stav_chranicka', 'stav_lanko', 'pokyny_vt']
      .forEach(f => {
        if (data.dohody[f]) {
          document.querySelector(`#dohodySection input[name="${f}"][value="${data.dohody[f]}"]`)?.click();
        }
      });

    (data.dohody.hlava_material || []).forEach(v => {
      document.querySelector(`#dohodySection input[name="hlava_material[]"][value="${v}"]`)?.click();
    });
    setVal('hlava_material_jiny', data.dohody.hlava_material_jiny);
    setVal('hlava_poznamka', data.dohody.hlava_poznamka);

    const sudySel = document.getElementById('sudy_kulovy');
    if (sudySel && data.dohody.sudy_kulovy != null) {
      sudySel.value = data.dohody.sudy_kulovy;
    }

    setVal('chl_prostor_poznamka', data.dohody.chl_prostor_poznamka);
    setVal('sudy_poznamka', data.dohody.sudy_poznamka);
    setVal('stav_poznamka', data.dohody.stav_poznamka);
    setVal('dohody_poznamka', data.dohody.dohody_poznamka);
    setVal('demontaz_poznamky', data.dohody.demontaz_poznamky);

    (data.dohody.kofola || []).forEach(v => {
      document.querySelector(`#dohodySection input[name="kofola[]"][value="${v}"]`)?.click();
    });
    setVal('kofola_poznamka', data.dohody.kofola_poznamka);
  }

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
    const rowsWrap = section.querySelector('.rows');
    rowsWrap.innerHTML = '';
    const arr = Array.isArray(data[type]) ? data[type] : [];
    arr.forEach(item => addRow(type, { value: item.value ?? '', qty: item.qty ?? '' }));

    if (data['pozn_' + type]) {
      const note = document.getElementById('pozn_' + type);
      if (note) note.value = data['pozn_' + type];
    }
  });
}

/**
 * Zkusí načíst data z deeplinku v URL
 * @returns {boolean} true pokud byl deeplink načten
 */
export function loadFromDeeplink() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const encoded = urlParams.get(DEEPLINK_PARAM);

    if (!encoded) {
      return false; // Žádný deeplink v URL
    }

    // Dekódovat data
    const data = decodeFormData(encoded);

    // Zeptat se uživatele, jestli chce načíst
    const wantsLoad = confirm(
      "🔗 Byl detekován sdílený odkaz s předvyplněným formulářem.\n\n" +
      "Chceš načíst data z odkazu?\n\n" +
      "OK = načíst data, ZRUŠIT = ignorovat"
    );

    if (!wantsLoad) {
      // Odstranit parametr z URL bez reload stránky
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      return false;
    }

    // Aplikovat data do formuláře
    applyDataToForm(data);

    // Označíme, že byl načten deeplink (kvůli naming souborů při exportu)
    window.__jsonReloaded = true;
    window.__jsonReloadedTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
    window.__loadedFromDeeplink = true;

    // Odstranit parametr z URL bez reload stránky
    const newUrl = window.location.pathname;
    window.history.replaceState({}, document.title, newUrl);

    alert('✅ Data z odkazu byla úspěšně načtena!');
    return true;

  } catch (err) {
    console.error('Načtení deeplinku selhalo:', err);
    alert('❌ Odkaz je neplatný nebo poškozený.\n\nChyba: ' + (err.message || err));

    // Odstranit špatný parametr z URL
    const newUrl = window.location.pathname;
    window.history.replaceState({}, document.title, newUrl);
    return false;
  }
}

// === Inicializace ===================================================================

/**
 * Inicializuje deeplink funkcionalitu
 */
export function initDeeplink() {
  // Zkusit načíst deeplink z URL při startu
  loadFromDeeplink();

  // Inicializovat tlačítko pro sdílení (pokud existuje)
  const shareBtn = document.getElementById('shareDeeplinkBtn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await copyDeeplinkToClipboard();
    });
  }
}

// === Export funkcí pro global scope (volání z HTML) ================================

/**
 * Globální funkce pro kopírování deeplinku (volatelná z onclick)
 */
export function shareDeeplinkGlobal() {
  copyDeeplinkToClipboard();
}
