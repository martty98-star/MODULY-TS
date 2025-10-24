# LASO PWA – Refaktoring do modulární struktury

## 📋 Přehled změn

Původní monolitický `script.js` (834 řádků) byl rozdělen na čitelné ES6 moduly.

---

## 🗂️ Nová struktura projektu

```
MODULY-TS/
├── index.html              # Hlavní HTML formulář
├── style.css               # Styly
├── sw.js                   # Service Worker (aktualizován pro nové moduly)
├── manifest.json           # PWA manifest
├── script.js.backup        # Záloha původního skriptu
└── js/                     # ✨ NOVÁ MODULÁRNÍ STRUKTURA
    ├── main.js             # Centrální inicializace
    ├── ui_dynamicSections.js
    ├── autofill.js
    ├── form_draft.js
    ├── offline_queue.js
    ├── json_import_export.js
    ├── csv_export.js
    └── pdf_generator.js
```

---

## 📦 Moduly

### 1. **main.js** – Centrální inicializace
- Importuje všechny ostatní moduly
- Inicializace při DOMContentLoaded
- Propojuje callbacky mezi moduly
- Registruje globální funkce pro HTML onclick

### 2. **ui_dynamicSections.js** – Práce s templates a řádky
- `getOptionsFor()` – načítá options z template elementů
- `createRow()` – vytváří dynamické řádky (select + qty + delete)
- `addRow()` – přidává řádek do sekce
- `enhanceSelect()` – přidává vyhledávací pole nad selecty
- `ensureDefaultRows()` – zajistí prázdný řádek v každé sekci

### 3. **autofill.js** – Automatické vyplňování
- `autofillFromURL()` – načítá URL parametry (?sapId=...&nazevProvozovny=...)
- `autoFillSpojky()` – automaticky vyplní spojky podle počtu vedení
- `initPivniVedeniListener()` – listener na změnu počtu vedení

### 4. **form_draft.js** – LocalStorage autosave
- `gatherDraftData()` – shromáždí všechna data z formuláře
- `scheduleSaveDraft()` – debounce ukládání (400ms)
- `attachAutosaveListeners()` – připojí listenery na input/change
- `loadDraftIfAny()` – načte rozpracovaný formulář
- `clearDraft()` – vymaže koncept

### 5. **offline_queue.js** – Offline režim
- `getSendQueue()` / `setSendQueue()` – správa fronty v localStorage
- `safePostOrQueue()` – odešle požadavek nebo zařadí do fronty
- `processSendQueue()` – pokusí se odeslat čekající požadavky
- `initOfflineQueue()` – inicializuje listener na změnu online stavu

### 6. **json_import_export.js** – JSON operace
- `ulozitData()` – hlavní export funkce (volána z HTML)
- `initJsonImport()` – inicializuje import z file inputu
- `applyJsonToForm()` – aplikuje JSON data do formuláře

### 7. **csv_export.js** – CSV generace
- `generateCsvFromJson()` – vytvoří CSV ze shromážděných dat
- `exportJsonToCsvAndUpload()` – export + upload do Power Automate
- Validace: pokud nejsou žádné položky, zobrazí alert

### 8. **pdf_generator.js** – PDF export (placeholder)
- `generatePdfSnapshot()` – připraveno pro html2canvas + jsPDF
- `initPdfExport()` – inicializace PDF tlačítka
- **Poznámka**: Vyžaduje přidání knihoven html2canvas a jsPDF

---

## ✅ Zachovaná funkčnost

- ✅ Načtení JSON souboru zpět do formuláře (včetně všech sekcí)
- ✅ Korektní CSV export (včetně poznámek a všech sekcí)
- ✅ Automatické doplnění hlavičky z URL parametrů
- ✅ Bezpečné odesílání do Power Automate přes `safePostOrQueue()`
- ✅ Offline fronta (localStorage queue) + automatický reupload
- ✅ Autosave konceptu s debounce
- ✅ Vyhledávání v select elementech
- ✅ Automatické vyplňování spojek podle počtu vedení

---

## 🐛 Opravené chyby

### 1. **Chybějící ID v HTML**
- ✅ Přidán `id="sudy_kulovy"` pro select kulového uzávěru

### 2. **CSV export neobsahoval všechny sekce**
- ✅ Upravena funkce `collectLineItemsFromJson()` v `csv_export.js`
- ✅ Přidány všechny typy sekcí včetně poznámek

### 3. **Validace při exportu**
- ✅ Pokud není JSON platný, zobrazí se: "Soubor nelze načíst – zkontroluj formát."
- ✅ Pokud CSV nemá položky, zobrazí se: "⚠️ Ve formuláři nejsou žádné vyplněné položky k exportu."

### 4. **Fallback pro chybějící pole**
- ✅ Použití `?.` operátoru a default hodnot `?? ''`
- ✅ Kontrola existence polí před nastavením hodnoty

---

## 🔧 Globální funkce (volané z HTML)

Tyto funkce jsou exportovány do `window` objektu v `main.js`:

- `ulozitData()` – uložení dat (JSON + CSV)
- `addRow(type, preset)` – přidání řádku
- `autoFillSpojky(pocet)` – autofill spojek
- `scheduleSaveDraft()` – ruční trigger autosave
- `clearDraft()` – smazání konceptu

---

## 🚀 Jak to použít

### Spuštění aplikace
1. Otevři `index.html` v prohlížeči
2. Aplikace se automaticky inicializuje
3. Service Worker cachuje všechny moduly pro offline režim

### Import/Export
- **Uložit data**: Klikni na "💾 Uložit data" → odešle JSON + CSV do Power Automate
- **Načíst data**: Klikni na "📂 Načíst data" → vyber JSON soubor

### Offline režim
- Pokud není připojení, požadavky se automaticky zařadí do fronty
- Po obnovení připojení se automaticky odešlou

---

## 📝 Další vylepšení (volitelné)

### PDF Export
Pro aktivaci PDF exportu:
1. Přidej knihovny do `index.html`:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
```
2. Odkomentuj kód v `js/pdf_generator.js`
3. Přidej tlačítko s `id="exportPdfBtn"` do HTML

### Rozšíření CSV exportu
- Přidej další sekce do pole `types` v `csv_export.js`
- Upravit formát CSV podle požadavků backendu

---

## 🔒 Bezpečnost

- Žádné credentials v kódu (použity Power Automate endpointy s SAS tokeny)
- LocalStorage pro draft – data jsou pouze lokální
- Offline queue – šifrování není nutné (public endpointy)

---

## 📚 Závislosti

- **Žádné npm packages** – čistý vanilla JavaScript
- **ES6 modules** – nativní podpora v moderních prohlížečích
- **Service Worker** – pro PWA a offline režim

---

## 🛠️ Troubleshooting

### Aplikace nefunguje
1. Zkontroluj konzoli (F12) na chybové hlášky
2. Ujisti se, že prohlížeč podporuje ES6 modules
3. Vyčisti cache (Ctrl+Shift+R)

### Offline režim nefunguje
1. Zkontroluj, zda je Service Worker registrován (DevTools → Application → Service Workers)
2. Vymaž starou cache: `zamereni-cache` → použije se nová `zamereni-cache-v2`

### Data se neukládají
1. Zkontroluj localStorage kvótu (DevTools → Application → Local Storage)
2. Vyzkoušej v režimu inkognito

---

## 📧 Kontakt

Pro chyby a návrhy kontaktuj: **Martin Krbec** +420 735 189 416

---

**Datum refaktoringu**: 2025-10-24
**Verze**: 2.0 (Modulární struktura)
