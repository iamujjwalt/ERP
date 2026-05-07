/**
 * export.js - Export functionality for PDF and Excel
 */

export function exportToPDF(tableId, filename = 'exported-data') {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  // Add Title
  doc.setFontSize(18);
  doc.text('EduSched Pro - Report', 14, 20);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
  
  // Create Table
  doc.autoTable({
    html: `#${tableId}`,
    startY: 40,
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235] },
    styles: { fontSize: 8 }
  });
  
  doc.save(`${filename}.pdf`);
}

export function exportToExcel(tableId, filename = 'exported-data') {
  const table = document.getElementById(tableId);
  const wb = XLSX.utils.table_to_book(table, { sheet: "Sheet JS" });
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
