// ===================================================================================
// Module: pdf_generator.js
// Purpose: Generace PDF snapshotů formuláře (placeholder pro budoucí implementaci)
// ===================================================================================

/**
 * Placeholder pro generování PDF pomocí html2canvas + jsPDF
 *
 * Pro implementaci PDF exportu:
 * 1. Přidej html2canvas: <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
 * 2. Přidej jsPDF: <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
 * 3. Implementuj funkci níže
 *
 * @param {string} elementId - ID elementu k zachycení
 * @param {string} filename - Název výstupního PDF
 * @returns {Promise<void>}
 */
export async function generatePdfSnapshot(elementId, filename) {
  console.warn('PDF generování není implementováno. Přidej html2canvas a jsPDF knihovny.');

  // Ukázkový kód pro budoucí implementaci:
  /*
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element s ID "${elementId}" nebyl nalezen`);
    }

    // Zachytit element jako canvas
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false
    });

    // Vytvořit PDF
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    // Přidat první stránku
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Přidat další stránky, pokud je obsah delší
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Stáhnout PDF
    pdf.save(filename);

    alert('PDF bylo úspěšně vygenerováno.');
  } catch (err) {
    console.error('Chyba při generování PDF:', err);
    alert('Chyba při generování PDF: ' + (err.message || err));
  }
  */

  alert('PDF generování není dostupné. Kontaktuj správce pro aktivaci této funkce.');
}

/**
 * Inicializace tlačítka pro PDF export (pokud existuje)
 */
export function initPdfExport() {
  const pdfBtn = document.getElementById('exportPdfBtn');
  if (!pdfBtn) return;

  pdfBtn.addEventListener('click', async () => {
    const sapId = document.getElementById('sapId')?.value || 'SAP';
    const provozovna = (document.getElementById('nazevProvozovny')?.value || 'PROVOZOVNA').replace(/\s+/g, '_');
    const filename = `${sapId}_${provozovna}_zamereni.pdf`;

    await generatePdfSnapshot('formWrapper', filename);
  });
}
