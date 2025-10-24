// ===================================================================================
// Module: autofill.js
// Purpose: Automatické vyplňování formuláře z URL parametrů a autofill spojek
// ===================================================================================

import { addRow, enhanceAllIn } from './ui_dynamicSections.js';

/**
 * Bezpečné nastavení hodnoty elementu (pokud existuje)
 * @param {string} id
 * @param {any} value
 */
function setIfExists(id, value) {
  const el = document.getElementById(id);
  if (el && value != null) el.value = value;
}

// === AutoFill z URL parametrů =======================================================

/**
 * Načte URL parametry a předvyplní hlavičku formuláře
 * Volá se při DOMContentLoaded
 */
export function autofillFromURL() {
  const q = new URLSearchParams(window.location.search);
  setIfExists('sapId', q.get('sapId'));
  setIfExists('nazevProvozovny', q.get('nazevProvozovny'));
  setIfExists('cisloTracku', q.get('cisloTracku'));
  setIfExists('pozadovanyDatum', q.get('datum'));
  setIfExists('adresaProvozovny', q.get('adresa'));
  setIfExists('kontakt', q.get('kontakt'));
}

// === AutoFill SPOJKY – podle počtu vedení ===========================================

/**
 * Tabulka spojek podle počtu pivních vedení
 */
const spojkyTabulka = {
  1: { 'PN580003132': 7,  'PN580003227': 1, 'PN580003143': 3  },
  2: { 'PN580003132': 8,  'PN580003227': 2, 'PN580003143': 4  },
  3: { 'PN580003132': 11, 'PN580003227': 3, 'PN580003143': 5  },
  4: { 'PN580003132': 14, 'PN580003227': 4, 'PN580003143': 6  },
  5: { 'PN580003132': 17, 'PN580003227': 5, 'PN580003143': 7  },
  6: { 'PN580003132': 20, 'PN580003227': 6, 'PN580003143': 8  },
  8: { 'PN580003132': 28, 'PN580003227': 8, 'PN580003143': 10 }
};

/**
 * Automaticky vyplní spojky podle počtu vedení
 * @param {number} pocetVedení - počet pivních vedení (1-8)
 */
export function autoFillSpojky(pocetVedení) {
  const vybrane = spojkyTabulka[pocetVedení];
  if (!vybrane) return;

  const spojkyRows = document.querySelector('#spojkySection .rows');
  if (!spojkyRows) return;

  spojkyRows.innerHTML = '';
  Object.entries(vybrane).forEach(([kod, qty]) => {
    addRow('spojky', { value: kod, qty });
  });

  try {
    enhanceAllIn(spojkyRows);
  } catch (e) {
    console.warn('enhanceAllIn failed:', e);
  }

  // Trigger autosave pokud je dostupné
  if (window.scheduleSaveDraft) {
    window.scheduleSaveDraft();
  }
}

/**
 * Inicializuje listener pro změnu počtu pivních vedení
 */
export function initPivniVedeniListener() {
  const pv = document.getElementById('pivniVedeni');
  if (!pv) return;

  pv.addEventListener('change', function () {
    const val = parseInt(this.value, 10);
    if (!isNaN(val)) autoFillSpojky(val);
  });

  // Pokud je již vyplněno, použij to
  const initial = parseInt(pv.value, 10);
  if (!isNaN(initial) && initial > 0) {
    setTimeout(() => autoFillSpojky(initial), 50);
  }
}
