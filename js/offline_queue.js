// ===================================================================================
// Module: offline_queue.js
// Purpose: Fronta offline požadavků – ukládá neodeslané požadavky do localStorage
//          a při obnovení připojení je automaticky odesílá
// ===================================================================================

const QUEUE_KEY = 'TS_SEND_QUEUE_V1';

// === LocalStorage queue operace ====================================================

/**
 * Načte frontu z localStorage
 * @returns {Array<Object>}
 */
export function getSendQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

/**
 * Uloží frontu do localStorage
 * @param {Array<Object>} q
 */
export function setSendQueue(q) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch (e) {
    console.warn('Uložení fronty selhalo:', e);
  }
}

/**
 * Přidá úlohu do fronty
 * @param {Object} task - {url, body, headers}
 */
export function enqueueRequest(task) {
  const q = getSendQueue();
  q.push({ ...task, queuedAt: new Date().toISOString() });
  setSendQueue(q);
}

// === Odeslání úlohy z fronty ========================================================

/**
 * Pokusí se odeslat jednu úlohu
 * @param {Object} task
 * @throws {Error} pokud se odeslání nezdaří
 */
async function trySendTask(task) {
  const { url, body, headers } = task;
  const resp = await fetch(url, {
    method: 'POST',
    headers: headers || { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!resp.ok) throw new Error('HTTP ' + resp.status);
}

// === Zpracování fronty ==============================================================

/**
 * Pokusí se odeslat všechny úlohy ve frontě
 * @returns {Promise<void>}
 */
export async function processSendQueue() {
  if (!navigator.onLine) return;

  const q = getSendQueue();
  if (!q.length) return;

  const remaining = [];
  for (const task of q) {
    try {
      await trySendTask(task);
    } catch (e) {
      console.warn('Odeslání z fronty selhalo:', e);
      remaining.push(task);
    }
  }

  setSendQueue(remaining);

  if (q.length && remaining.length === 0) {
    alert('Byli jste zpět online – všechny čekající položky byly úspěšně odeslány.');
  }
}

// === Bezpečné odeslání s fallback do fronty =========================================

/**
 * Pokusí se odeslat požadavek. Pokud selže nebo není připojení, zařadí do fronty.
 * @param {string} url
 * @param {Object} body
 * @param {Object} headers
 * @returns {Promise<{ok?: boolean, queued?: boolean}>}
 */
export async function safePostOrQueue(url, body, headers) {
  const doEnqueue = () => {
    enqueueRequest({ url, body, headers });
    alert('Nejste online nebo je dočasný výpadek připojení. Úloha byla uložena a po připojení ji odešlu automaticky.');
    return { queued: true };
  };

  if (!navigator.onLine) return doEnqueue();

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: headers || { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return { ok: true };
  } catch (e) {
    console.warn('Odeslání selhalo, zařazuji do fronty:', e);
    return doEnqueue();
  }
}

// === Inicializace – posluchač na změnu online stavu =================================

/**
 * Inicializuje listener pro připojení k síti
 */
export function initOfflineQueue() {
  window.addEventListener('online', processSendQueue);
}
