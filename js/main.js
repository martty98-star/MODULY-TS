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

import {
  initDeeplink,
  loadFromDeeplink,
  shareDeeplinkGlobal
} from './deeplink.js';

// === GLOBÁLNÍ FUNKCE VOLANÉ Z HTML =================================================
// (tyto funkce musí být přístupné z inline onclick atributů v HTML)

window.ulozitData = ulozitData;
window.addRow = addRow;
window.autoFillSpojky = autoFillSpojky;
window.scheduleSaveDraft = scheduleSaveDraft;
window.clearDraft = clearDraft;
window.shareDeeplink = shareDeeplinkGlobal;

// === INICIALIZACE PŘI NAČTENÍ STRÁNKY ==============================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 LASO PWA inicializace...');

  // === 1) Propojení callbacků mezi moduly ===
  setCallbacks({
    scheduleSaveDraft,
    attachAutosaveListeners
  });

  // === 2) Zkusit načíst deeplink z URL (nejvyšší priorita) ===
  const loadedFromDeeplink = loadFromDeeplink();

  // === 3) Automatické vyplnění z URL parametrů (pouze pokud není deeplink) ===
  if (!loadedFromDeeplink) {
    autofillFromURL();
  }

  // === 4) Připojení autosave listenerů na celý dokument ===
  attachAutosaveListeners(document);

  // === 5) Inicializace select enhancement (search filter) ===
  try {
    enhanceAllIn(document);
    initSelectEnhancement();
  } catch (e) {
    console.warn('Select enhancement chyba:', e);
  }

  // === 6) Načtení rozpracovaného formuláře z localStorage (pouze pokud není deeplink) ===
  if (!loadedFromDeeplink) {
    loadDraftIfAny();
  }

  // === 7) Zajištění default řádků v sekcích ===
  try {
    ensureDefaultRows();
  } catch (e) {
    console.warn('ensureDefaultRows chyba:', e);
  }

  // === 8) Inicializace pivních vedení (autofill spojky) ===
  initPivniVedeniListener();

  // === 9) Inicializace JSON importu ===
  initJsonImport();

  // === 10) Inicializace PDF exportu (pokud je implementováno) ===
  initPdfExport();

  // === 11) Inicializace deeplink tlačítka ===
  initDeeplink();

  // === 12) Inicializace offline queue ===
  initOfflineQueue();
  processSendQueue(); // Pokusit se odeslat čekající položky

  // === 13) Povolení "Uložit data" tlačítka ===
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
