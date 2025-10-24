// ===================================================================================
// Module: csv_export.js
// Purpose: Generace CSV souboru z formulářových dat a upload do Power Automate
// ===================================================================================

import { safePostOrQueue } from './offline_queue.js';

// === CSV generace ===================================================================

/**
 * Vytvoří mapu produktových kódů → názvy z template elementů
 * @returns {Object}
 */
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

/**
 * Shromáždí všechny řádky položek z JSON dat
 * @param {Object} json
 * @returns {Array<{section: string, code: string, qty: string}>}
 */
function collectLineItemsFromJson(json) {
  const types = [
    'plakety', 'chl', 'chl_pris', 'vh_hlavy', 'kohouty', 'kohout_dily',
    'narazec', 'odkapniky', 'plyn', 'hadice_python', 'spojky', 'tesneni',
    'sanitace', 'vh_prisl', 'drzaky_desky', 'izolace', 'techno', 'tank',
    'ostatni', 'pulty'
  ];

  const rows = [];
  types.forEach(type => {
    const arr = Array.isArray(json[type]) ? json[type] : [];
    arr.forEach(it => {
      const code = (it.value || '').toString().trim();
      const qty = (it.qty || '').toString().trim() || '';
      if (code || qty) {
        rows.push({ section: type, code, qty });
      }
    });

    // Přidej poznámky jako speciální položku
    const noteKey = `pozn_${type}`;
    if (json[noteKey] && json[noteKey].trim()) {
      rows.push({
        section: type,
        code: `POZNÁMKA_${type.toUpperCase()}`,
        qty: json[noteKey]
      });
    }
  });

  return rows;
}

/**
 * Escapuje hodnotu pro CSV (uvozovky)
 * @param {any} value
 * @returns {string}
 */
function csvEscapeField(value) {
  if (value === null || value === undefined) return '""';
  const s = value.toString();
  return '"' + s.replace(/"/g, '""') + '"';
}

/**
 * Generuje CSV ze shromážděných dat
 * @param {Object} json - kompletní JSON data formuláře
 * @returns {{csvText: string, base64: string}}
 */
export function generateCsvFromJson(json) {
  const meta = {
    SAP: json.sapId || '',
    Provozovna: json.nazevProvozovny || '',
    Track: json.cisloTracku || '',
    Vyplnil: json.vyplnilJmeno || '',
    Datum: json.vyplnilDatum || (new Date()).toISOString().split('T')[0]
  };

  const prodMap = buildProductMapFromTemplates();
  const items = collectLineItemsFromJson(json);

  // Validace – pokud nejsou žádné položky
  if (items.length === 0) {
    alert('⚠️ Ve formuláři nejsou žádné vyplněné položky k exportu.');
    throw new Error('Žádné položky k exportu');
  }

  const delim = ';';
  const lines = [];

  // === HLAVIČKA CSV ===
  lines.push(['SAP', 'Provozovna', 'Track', 'Vyplnil', 'Datum'].map(csvEscapeField).join(delim));
  lines.push([meta.SAP, meta.Provozovna, meta.Track, meta.Vyplnil, meta.Datum].map(csvEscapeField).join(delim));
  lines.push('');

  // === POLOŽKY ===
  lines.push(['SAP POLOŽKY', 'QTY (POČET)', 'NÁZEV', 'TYP POLOŽKY'].map(csvEscapeField).join(delim));

  items.forEach(it => {
    const name = prodMap[it.code] || '';
    lines.push([it.code, it.qty, name, it.section].map(csvEscapeField).join(delim));
  });

  const csv = '\uFEFF' + lines.join('\r\n');
  const base64 = btoa(unescape(encodeURIComponent(csv)));
  return { csvText: csv, base64 };
}

// === Upload CSV do Power Automate ==================================================

/**
 * Odešle CSV soubor do Power Automate endpointu
 * @param {string} base64content
 * @param {string} filename
 * @returns {Promise<Object>}
 */
async function uploadCsvToPA(base64content, filename) {
  const endpoint = 'https://prod-12.westeurope.logic.azure.com:443/workflows/8ce6b0dd923e4de1b4568ed89bbfdb63/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=LEw2JNM_ZEqsJcnm_Ap7OTKbDW9RnOFF1UKbgCDKO24';
  const body = {
    csvFileName: filename,
    csvContent: base64content
  };

  return safePostOrQueue(endpoint, body, { 'Content-Type': 'application/json' });
}

// === Export a upload ================================================================

/**
 * Kompletní export do CSV a odeslání do Power Automate
 * @param {Object} json - kompletní JSON data formuláře
 * @returns {Promise<void>}
 */
export async function exportJsonToCsvAndUpload(json) {
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

    // Odeslání do Power Automate
    try {
      const r = await uploadCsvToPA(base64, fileName);
      if (r && r.ok) {
        alert('CSV bylo odesláno do Power Automate / SharePoint.');
      }
      // Pokud je to jen queued, už jsme hlášku zobrazili v safePostOrQueue
    } catch (err) {
      console.warn('Upload CSV do PA selhal:', err);
      alert('CSV export OK, ale upload do PA selhal: ' + (err.message || err));
    }
  } catch (err) {
    console.error('Chyba při vytváření CSV:', err);
    if (err.message !== 'Žádné položky k exportu') {
      alert('Chyba při vytváření CSV: ' + (err.message || err));
    }
  }
}
