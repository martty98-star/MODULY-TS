// ===================================================================================
// Module: json_import_export.js
// Purpose: Export formuláře do JSON, upload do Power Automate, import JSON zpět
// ===================================================================================

import { setVal, addRow } from './ui_dynamicSections.js';
import { gatherDraftData, clearDraft } from './form_draft.js';
import { safePostOrQueue } from './offline_queue.js';
import { exportJsonToCsvAndUpload } from './csv_export.js';

// === JSON EXPORT ====================================================================

/**
 * Hlavní funkce pro uložení dat – exportuje JSON a CSV, odešle do Power Automate
 * Volána z HTML tlačítka "Uložit data"
 */
export async function ulozitData() {
  const data = gatherDraftData();

  // === METADATA A NÁZVY SOUBORŮ ===
  const sapId = data.sapId || 'SAP';
  const provozovna = (data.nazevProvozovny || 'PROVOZOVNA').replace(/\s+/g, '_');
  const track = data.cisloTracku || 'TRACK';
  const vyplnil = (document.getElementById('vyplnilJmeno')?.value || 'NEURCENO').replace(/\s+/g, '_');

  const editedAtISO = new Date().toISOString();
  const technikVal = document.getElementById('vyplnilJmeno')?.value || 'NEURCENO';
  const dataToSend = { ...data, editedAt: editedAtISO, technik: technikVal };

  // Název JSON
  let jsonFileName = `${sapId}_${provozovna}_${track}_${vyplnil}.json`;
  if (window.__jsonReloaded) {
    const ts = (window.__jsonReloadedTimestamp || new Date().toISOString().replace(/[:.]/g, '-'));
    jsonFileName = `${sapId}_${provozovna}_${track}_EDITOVANO_${ts}.json`;
    dataToSend.__editedSuffix = `_EDITOVANO_${ts}`;
  }

  // === ODESLÁNÍ JSON DO POWER AUTOMATE ===
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
    // Pokud je to queued (offline), hlášku řeší safePostOrQueue
  } catch (err) {
    console.warn('Odeslání JSON do PA selhalo:', err);
    alert('Online uložení JSON selhalo.');
  }

  // === CSV EXPORT + UPLOAD ===
  try {
    await exportJsonToCsvAndUpload(dataToSend);
  } catch (err) {
    console.warn('CSV export/odeslání selhalo:', err);
    // Alert už je v csv_export.js
  }
}

// === JSON IMPORT ====================================================================

/**
 * Načte JSON soubor a aplikuje ho do formuláře
 * @param {Object} data - parsovaný JSON
 */
function applyJsonToForm(data) {
  // Validace
  if (!data || typeof data !== 'object') {
    alert('Soubor nelze načíst – zkontroluj formát.');
    return;
  }

  // === 1) HLAVIČKA ===
  ['sapId', 'nazevProvozovny', 'cisloTracku', 'pozadovanyDatum', 'adresaProvozovny', 'pozadovanyDatum2', 'kontakt', 'vyplnilJmeno', 'vyplnilDatum']
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

    (data.dohody.kofola || []).forEach(v => {
      document.querySelector(`#dohodySection input[name="kofola[]"][value="${v}"]`)?.click();
    });
    setVal('kofola_poznamka', data.dohody.kofola_poznamka);

    setVal('demontaz_poznamky', data.dohody.demontaz_poznamky);
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

  // Označíme, že byl načten JSON
  window.__jsonReloaded = true;
  window.__jsonReloadedTimestamp = new Date().toISOString().replace(/[:.]/g, '-');

  alert('JSON byl načten.');
}

/**
 * Inicializuje listener pro načtení JSON souboru
 */
export function initJsonImport() {
  const jsonInputEl = document.getElementById('jsonInput');
  if (!jsonInputEl) return;

  jsonInputEl.addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        applyJsonToForm(data);
      } catch (err) {
        console.error('Chyba při načítání JSON:', err);
        alert('Soubor nelze načíst – zkontroluj formát. Chyba: ' + (err.message || err));
      }
    };
    reader.readAsText(file);
  });
}
