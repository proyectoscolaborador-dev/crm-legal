import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EmpresaUsuario, Presupuesto, Partida } from '@/types/empresa';

interface PdfGeneratorOptions {
  presupuesto: Presupuesto | {
    numero_presupuesto: string;
    fecha_presupuesto: string;
    validez_dias: number;
    cliente_nombre: string;
    cliente_direccion?: string | null;
    cliente_cp?: string | null;
    cliente_ciudad?: string | null;
    cliente_provincia?: string | null;
    cliente_telefono?: string | null;
    cliente_email?: string | null;
    obra_titulo: string;
    descripcion_trabajo_larga?: string | null;
    comercial_nombre?: string | null;
    estado_presupuesto: string;
    partidas: Partida[];
    iva_porcentaje: number;
  };
  empresa: EmpresaUsuario;
  subtotal: number;
  iva_importe: number;
  total: number;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-ES', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  }).format(value) + ' €';
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-ES', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
};

export async function generatePresupuestoPdf(options: PdfGeneratorOptions): Promise<Blob> {
  const { presupuesto, empresa, subtotal, iva_importe, total } = options;
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  // Colors
  const primaryColor: [number, number, number] = [41, 98, 255];
  const darkGray: [number, number, number] = [51, 51, 51];
  const lightGray: [number, number, number] = [150, 150, 150];

  // --- HEADER ---
  // Company logo (if exists) - try to load it
  if (empresa.empresa_logo_url) {
    try {
      const img = await loadImage(empresa.empresa_logo_url);
      const logoHeight = 20;
      const logoWidth = (img.width / img.height) * logoHeight;
      doc.addImage(img.src, 'PNG', margin, yPos, Math.min(logoWidth, 50), logoHeight);
    } catch (e) {
      console.log('Could not load logo:', e);
    }
  }

  // Company info (right side)
  doc.setFontSize(10);
  doc.setTextColor(...darkGray);
  doc.setFont('helvetica', 'bold');
  doc.text(empresa.empresa_nombre, pageWidth - margin, yPos, { align: 'right' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...lightGray);
  yPos += 5;
  doc.text(`CIF: ${empresa.empresa_cif}`, pageWidth - margin, yPos, { align: 'right' });
  yPos += 4;
  doc.text(empresa.empresa_direccion, pageWidth - margin, yPos, { align: 'right' });
  yPos += 4;
  doc.text(`${empresa.empresa_cp} ${empresa.empresa_ciudad} (${empresa.empresa_provincia})`, pageWidth - margin, yPos, { align: 'right' });
  yPos += 4;
  doc.text(`Tel: ${empresa.empresa_telefono}`, pageWidth - margin, yPos, { align: 'right' });
  yPos += 4;
  doc.text(empresa.empresa_email, pageWidth - margin, yPos, { align: 'right' });
  if (empresa.empresa_web) {
    yPos += 4;
    doc.text(empresa.empresa_web, pageWidth - margin, yPos, { align: 'right' });
  }

  yPos = 55;

  // Divider line
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // --- TITLE BLOCK ---
  doc.setFontSize(18);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text(`PRESUPUESTO Nº ${presupuesto.numero_presupuesto}`, margin, yPos);
  yPos += 6;

  doc.setFontSize(10);
  doc.setTextColor(...lightGray);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha: ${formatDate(presupuesto.fecha_presupuesto)} · Validez: ${presupuesto.validez_dias} días`, margin, yPos);
  yPos += 12;

  // --- TWO COLUMN INFO ---
  const colWidth = (contentWidth - 10) / 2;
  
  // Client card
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(margin, yPos, colWidth, 35, 3, 3, 'F');
  doc.setDrawColor(240, 240, 240);
  doc.roundedRect(margin, yPos, colWidth, 35, 3, 3, 'S');

  doc.setFontSize(8);
  doc.setTextColor(...lightGray);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DEL CLIENTE', margin + 5, yPos + 6);

  doc.setFontSize(10);
  doc.setTextColor(...darkGray);
  doc.setFont('helvetica', 'bold');
  doc.text(presupuesto.cliente_nombre, margin + 5, yPos + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  let clientY = yPos + 18;
  if (presupuesto.cliente_direccion) {
    doc.text(presupuesto.cliente_direccion, margin + 5, clientY);
    clientY += 4;
  }
  if (presupuesto.cliente_cp || presupuesto.cliente_ciudad) {
    doc.text(`${presupuesto.cliente_cp || ''} ${presupuesto.cliente_ciudad || ''} ${presupuesto.cliente_provincia ? `(${presupuesto.cliente_provincia})` : ''}`.trim(), margin + 5, clientY);
    clientY += 4;
  }
  if (presupuesto.cliente_telefono) {
    doc.text(`Tel: ${presupuesto.cliente_telefono}`, margin + 5, clientY);
  }

  // Summary card
  const summaryX = margin + colWidth + 10;
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(summaryX, yPos, colWidth, 35, 3, 3, 'F');
  doc.setDrawColor(240, 240, 240);
  doc.roundedRect(summaryX, yPos, colWidth, 35, 3, 3, 'S');

  doc.setFontSize(8);
  doc.setTextColor(...lightGray);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMEN', summaryX + 5, yPos + 6);

  doc.setFontSize(9);
  doc.setTextColor(...darkGray);
  doc.setFont('helvetica', 'normal');
  doc.text(`Trabajo: ${presupuesto.obra_titulo}`, summaryX + 5, yPos + 13);
  doc.text(`Estado: ${presupuesto.estado_presupuesto}`, summaryX + 5, yPos + 18);
  doc.text(`Comercial: ${presupuesto.comercial_nombre || '-'}`, summaryX + 5, yPos + 23);

  yPos += 42;

  // --- DESCRIPTION ---
  if (presupuesto.descripcion_trabajo_larga) {
    doc.setFontSize(10);
    doc.setTextColor(...darkGray);
    doc.setFont('helvetica', 'bold');
    doc.text('DESCRIPCIÓN DEL TRABAJO', margin, yPos);
    yPos += 6;

    doc.setFillColor(250, 250, 250);
    const descLines = doc.splitTextToSize(presupuesto.descripcion_trabajo_larga, contentWidth - 10);
    const descHeight = descLines.length * 4.5 + 8;
    doc.roundedRect(margin, yPos, contentWidth, descHeight, 3, 3, 'F');
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(descLines, margin + 5, yPos + 6);
    yPos += descHeight + 8;
  }

  // --- PARTIDAS TABLE ---
  doc.setFontSize(10);
  doc.setTextColor(...darkGray);
  doc.setFont('helvetica', 'bold');
  doc.text('DETALLE ECONÓMICO', margin, yPos);
  yPos += 4;

  const tableData = presupuesto.partidas.map((p: Partida) => [
    p.concepto,
    p.cantidad.toString(),
    formatCurrency(p.precio_unidad),
    formatCurrency(p.importe_linea)
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Concepto', 'Cantidad', 'Precio/Ud', 'Importe']],
    body: tableData,
    theme: 'plain',
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: [245, 245, 245],
      textColor: [80, 80, 80],
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [60, 60, 60]
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'right', cellWidth: 25 },
      2: { halign: 'right', cellWidth: 30 },
      3: { halign: 'right', cellWidth: 30, fontStyle: 'bold' }
    },
    alternateRowStyles: {
      fillColor: [252, 252, 252]
    }
  });

  // Get the final Y position after table
  yPos = (doc as any).lastAutoTable.finalY + 10;

  // --- TOTALS ---
  const totalsX = pageWidth - margin - 70;
  
  doc.setFontSize(9);
  doc.setTextColor(...lightGray);
  doc.text('Subtotal', totalsX, yPos);
  doc.setTextColor(...darkGray);
  doc.text(formatCurrency(subtotal), pageWidth - margin, yPos, { align: 'right' });
  yPos += 5;

  doc.setTextColor(...lightGray);
  doc.text(`IVA ${presupuesto.iva_porcentaje}%`, totalsX, yPos);
  doc.setTextColor(...darkGray);
  doc.text(formatCurrency(iva_importe), pageWidth - margin, yPos, { align: 'right' });
  yPos += 2;

  doc.setDrawColor(200, 200, 200);
  doc.line(totalsX, yPos, pageWidth - margin, yPos);
  yPos += 5;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('TOTAL PRESUPUESTO', totalsX, yPos);
  doc.text(formatCurrency(total), pageWidth - margin, yPos, { align: 'right' });
  yPos += 12;

  // --- CONDITIONS ---
  if (empresa.condiciones_generales) {
    doc.setFontSize(8);
    doc.setTextColor(...lightGray);
    doc.setFont('helvetica', 'bold');
    doc.text('CONDICIONES GENERALES:', margin, yPos);
    yPos += 4;
    doc.setFont('helvetica', 'normal');
    const condLines = doc.splitTextToSize(empresa.condiciones_generales, contentWidth);
    doc.text(condLines, margin, yPos);
    yPos += condLines.length * 3.5 + 8;
  }

  // --- SIGNATURE BLOCK ---
  if (yPos < 240) {
    yPos = Math.max(yPos + 10, 220);
  }

  doc.setDrawColor(220, 220, 220);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  doc.setFontSize(9);
  doc.setTextColor(...darkGray);
  doc.setFont('helvetica', 'italic');
  doc.text('"Acepto el presente presupuesto y las condiciones indicadas."', margin, yPos);
  yPos += 12;

  doc.setFont('helvetica', 'normal');
  doc.text('Firma y DNI del cliente: _______________________________', margin, yPos);
  yPos += 8;
  doc.text('Fecha: ____ / ____ / __________', margin, yPos);

  // --- FOOTER ---
  const footerY = doc.internal.pageSize.getHeight() - 10;
  doc.setDrawColor(240, 240, 240);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
  
  doc.setFontSize(7);
  doc.setTextColor(...lightGray);
  const footerText = `${empresa.empresa_nombre} · ${empresa.empresa_direccion} · ${empresa.empresa_cp} ${empresa.empresa_ciudad} (${empresa.empresa_provincia}) · Tel: ${empresa.empresa_telefono} · ${empresa.empresa_email}`;
  doc.text(footerText, pageWidth / 2, footerY, { align: 'center' });

  return doc.output('blob');
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export function downloadPdf(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function openPdfInNewTab(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}
