// ===================================================================================
// Module: main.js
// Purpose: Centrální inicializace PWA aplikace LASO – zaměřovací formulář
// ===================================================================================

// === IMPORT VŠECH MODULŮ ============================================================

import {
  setCallbacks,
  addRow,
  ensureDefaultRows,
  enhanceAllIn,
  initSelectEnhancement,
  attachAutosaveListeners
} from './ui_dynamicSections.js';

import {
  autofillFromURL,
  autoFillSpojky,
  initPivniVedeniListener
} from './autofill.js';

import {
  scheduleSaveDraft,
  loadDraftIfAny,
  clearDraft
} from './form_draft.js';

import {
  initOfflineQueue,
  processSendQueue
} from './offline_queue.js';

import {
  ulozitData,
  initJsonImport
} from './json_import_export.js';

import { initPdfExport } from './pdf_generator.js';

// === GLOBÁLNÍ FUNKCE VOLANÉ Z HTML =================================================
// (tyto funkce musí být přístupné z inline onclick atributů v HTML)

window.ulozitData = ulozitData;
window.addRow = addRow;
window.autoFillSpojky = autoFillSpojky;
window.scheduleSaveDraft = scheduleSaveDraft;
window.clearDraft = clearDraft;

// === INICIALIZACE PŘI NAČTENÍ STRÁNKY ==============================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 LASO PWA inicializace...');

  // === 1) Propojení callbacků mezi moduly ===
  setCallbacks({
    scheduleSaveDraft,
    attachAutosaveListeners
  });

  // === 2) Automatické vyplnění z URL parametrů ===
  autofillFromURL();

  // === 3) Připojení autosave listenerů na celý dokument ===
  attachAutosaveListeners(document);

  // === 4) Inicializace select enhancement (search filter) ===
  try {
    enhanceAllIn(document);
    initSelectEnhancement();
  } catch (e) {
    console.warn('Select enhancement chyba:', e);
  }

  // === 5) Načtení rozpracovaného formuláře z localStorage ===
  loadDraftIfAny();

  // === 6) Zajištění default řádků v sekcích ===
  try {
    ensureDefaultRows();
  } catch (e) {
    console.warn('ensureDefaultRows chyba:', e);
  }

  // === 7) Inicializace pivních vedení (autofill spojky) ===
  initPivniVedeniListener();

  // === 8) Inicializace JSON importu ===
  initJsonImport();

  // === 9) Inicializace PDF exportu (pokud je implementováno) ===
  initPdfExport();

  // === 10) Inicializace offline queue ===
  initOfflineQueue();
  processSendQueue(); // Pokusit se odeslat čekající položky

  // === 11) Povolení "Uložit data" tlačítka ===
  const saveBtn = Array.from(document.querySelectorAll('button'))
    .find(b => b.getAttribute('onclick') && b.getAttribute('onclick').includes('ulozitData'));
  if (saveBtn) saveBtn.disabled = false;

  console.log('✅ LASO PWA inicializace dokončena');
});

// === DETEKCE iOS – pro případnou speciální logiku ==================================

export function isIOS() {
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isWebView = (window.webkit && window.webkit.messageHandlers) || /FBAN|FBAV|Instagram|Line\/|MicroMessenger|wv/.test(ua);
  return iOS && (isSafari || isWebView || true);
}
