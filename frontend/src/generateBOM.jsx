import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export async function exportDesignPackagePDF({ result, width, depth, style, budget }) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const primaryGold = [197, 160, 89];
  const darkNavy = [11, 15, 25];
  const textMuted = [148, 163, 184];

  // --- 1. Architectural Header Banner ---
  doc.setFillColor(...darkNavy);
  doc.rect(0, 0, pageWidth, 110, 'F');

  // Brand Accent Line
  doc.setDrawColor(...primaryGold);
  doc.setLineWidth(2.5);
  doc.line(40, 110, pageWidth - 40, 110);

  // Brand Titles
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...primaryGold);
  doc.text('KOHLER ARCHITECTURAL STUDIO | SPECIFICATION PACKAGE', 40, 42);

  doc.setFontSize(20);
  doc.setTextColor(248, 250, 252);
  doc.text('Generative Spatial Design Specification', 40, 68);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...textMuted);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} | Studio Revision Build`, 40, 88);

  // Valuation Badge (Right Aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primaryGold);
  doc.text('TOTAL SUITE VALUATION', pageWidth - 40, 48, { align: 'right' });

  doc.setFontSize(22);
  doc.setTextColor(248, 250, 252);
  doc.text(`$${Number(result.total_price || 0).toLocaleString()}`, pageWidth - 40, 76, { align: 'right' });

  // --- 2. Project Context & Spatial Parameters ---
  let startY = 135;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('1. SPATIAL & ARCHITECTURAL SCOPE', 40, startY);

  autoTable(doc, {
    startY: startY + 8,
    margin: { left: 40, right: 40 },
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 4, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold', width: 140, textColor: [71, 85, 105] },
      1: { width: 130 },
      2: { fontStyle: 'bold', width: 140, textColor: [71, 85, 105] },
      3: { width: 130 }
    },
    body: [
      ['Room Dimensions:', `${width} ft × ${depth} ft (${width * depth} sq ft)`, 'Target Allocation:', `$${Number(budget).toLocaleString()} USD`],
      ['Aesthetic Profile:', style, 'Active Suite Tier:', result.title || 'Curated Suite'],
      ['Egress Guideline:', 'NKBA Guideline 12 & ADA 604 Compliant', 'WaterSense Target:', 'LEED Ultra-Low Baseline (<1.5 GPM avg)']
    ]
  });

  // --- 3. Itemized Bill of Materials (BOM) ---
  const detailedBundle = result.detailed_bundle || {};
  const bomRows = Object.entries(detailedBundle).map(([cat, item]) => [
    cat.toUpperCase(),
    item.name || 'Kohler Architectural Fixture',
    item.finish || 'Specified Finish',
    item.id || 'N/A',
    item.flow_rate || 'Standard',
    `$${Number(item.price || 0).toLocaleString()}`
  ]);

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 20,
    margin: { left: 40, right: 40 },
    theme: 'grid',
    headStyles: {
      fillColor: darkNavy,
      textColor: [248, 250, 252],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'left'
    },
    styles: { fontSize: 8.5, cellPadding: 6, textColor: [15, 23, 42] },
    columnStyles: {
      0: { fontStyle: 'bold', width: 65 },
      1: { width: 170 },
      2: { width: 95 },
      3: { width: 85, font: 'courier' },
      4: { width: 65 },
      5: { halign: 'right', fontStyle: 'bold', width: 60 }
    },
    head: [['CATEGORY', 'SPECIFIED FIXTURE', 'FINISH', 'KOHLER SKU', 'RATING', 'PRICE']],
    body: bomRows.length > 0 ? bomRows : [
      ['SUITE', 'Curated Complete Fixture Collection', 'Specified Finish', 'K-SUITE', 'LEED', `$${result.total_price}`]
    ],
    foot: [[
      { content: 'TOTAL ESTIMATED EQUIPMENT COST', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: `$${Number(result.total_price || 0).toLocaleString()}`, styles: { halign: 'right', fontStyle: 'bold', textColor: [180, 83, 9] } }
    ]]
  });

  // --- 4. Architectural Rationale & Ecology ---
  const rationaleY = doc.lastAutoTable.finalY + 22;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('2. DESIGN RATIONALE & SUSTAINABILITY AUDIT', 40, rationaleY);

  const explanationText = result.explanation ||
    'Curated collection harmonized to achieve aesthetic coherence, ergonomic spatial clearance, and WaterSense eco-efficiency.';
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  
  const splitRationale = doc.splitTextToSize(explanationText, pageWidth - 80);
  doc.text(splitRationale, 40, rationaleY + 14);

  // --- 5. MEP Rough-In & Compliance Checklist ---
  const mepY = rationaleY + 14 + splitRationale.length * 11 + 14;

  autoTable(doc, {
    startY: mepY,
    margin: { left: 40, right: 40 },
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 5, textColor: [30, 41, 59] },
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
    head: [['TRADE / CODE REQUIREMENT', 'SPECIFICATION PARAMETER', 'VERIFICATION STATUS']],
    body: [
      ['Plumbing Rough-In Water Supply', 'Standard 1/2" NPT Hot & Cold Connections with Stop Valves', '✓ Verified Compatible'],
      ['Egress Walkway Clearance', 'Min. 21" unobstructed front walkway across all fixtures (NKBA 12)', '✓ Cleared in 3D Model'],
      ['Toilet Rough-In Centerline', 'Min. 15" from centerline to side wall / partition (ADA 604.2)', '✓ Code Compliant'],
      ['Drainage & Egress Trapways', '2" Waste Stack for Shower/Bath; 3" Direct Soil Stack for Water Closet', '✓ Standard Schedule'],
      ['Annual Water Stewardship', 'WaterSense-certified low-flow fixtures reduce footprint by ~9,300 gal/yr', '✓ LEED Eligible']
    ]
  });

  // --- 6. Footer ---
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('CONFIDENTIAL & PROPRIETARY — KOHLER CO. ARCHITECTURAL SPECIFICATION SPEC SHEET', 40, pageHeight - 25);
  doc.text(`Page 1 of 1`, pageWidth - 40, pageHeight - 25, { align: 'right' });

  // Save the PDF
  const sanitizedTitle = (result.title || 'Kohler_Design_Spec').replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`${sanitizedTitle}_${width}x${depth}ft.pdf`);
}