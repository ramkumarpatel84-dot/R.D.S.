/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { BillData } from '../types';

export async function downloadBillAsPDF(
  element: HTMLElement | null,
  bill: BillData,
  onStart?: () => void,
  onComplete?: () => void,
  onError?: (err: any) => void
) {
  if (!element) {
    if (onError) onError(new Error('रसीद प्रिव्यू तत्व नहीं मिला।'));
    return;
  }

  try {
    if (onStart) onStart();

    // Temporarily ensure high fidelity capture styling
    const originalShadow = element.style.boxShadow;
    element.style.boxShadow = 'none';

    const canvas = await html2canvas(element, {
      scale: 2.5, // High resolution
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      onclone: (clonedDoc) => {
        // Remove all stylesheets and style tags to prevent oklch parsing errors in html2canvas
        const styles = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
        styles.forEach((s) => s.remove());

        // Monkey-patch window.getComputedStyle in the cloned document so any oklch return value is intercepted
        const win = clonedDoc.defaultView;
        if (win) {
          const originalGetComputedStyle = win.getComputedStyle.bind(win);
          win.getComputedStyle = (elt: Element, pseudoElt?: string | null): CSSStyleDeclaration => {
            const style = originalGetComputedStyle(elt, pseudoElt);
            return new Proxy(style, {
              get(target, prop, receiver) {
                const val = Reflect.get(target, prop, receiver);
                if (typeof val === 'string' && val.includes('oklch')) {
                  if (prop === 'backgroundColor' || prop === 'background') return 'rgb(255, 255, 255)';
                  if (prop === 'color') return 'rgb(15, 23, 42)';
                  return 'rgb(148, 163, 184)';
                }
                return val;
              }
            });
          };
        }

        // Helper to safely sanitize any oklch color string
        const toSafeColor = (colorStr: string): string => {
          if (!colorStr) return colorStr;
          if (colorStr.includes('oklch')) {
            return 'rgb(15, 23, 42)'; // Safe slate-900 fallback
          }
          return colorStr;
        };

        // Inline computed styles for all elements to ensure valid rgb colors for html2canvas
        const allElements = clonedDoc.querySelectorAll('*');
        allElements.forEach((el, idx) => {
          if (el instanceof HTMLElement) {
            const origEl = element.querySelectorAll('*')[idx];
            if (origEl) {
              const computed = window.getComputedStyle(origEl);
              const bg = toSafeColor(computed.backgroundColor);
              const color = toSafeColor(computed.color);
              const borderColor = toSafeColor(computed.borderColor);
              if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
                el.style.backgroundColor = bg;
              }
              if (color) {
                el.style.color = color;
              }
              if (borderColor && borderColor !== 'rgba(0, 0, 0, 0)' && borderColor !== 'transparent') {
                el.style.borderColor = borderColor;
              }
            }
          }
        });
      },
    });

    element.style.boxShadow = originalShadow;

    const imgData = canvas.toDataURL('image/png');
    
    // Create jsPDF instance (A4 size, portrait, millimeters)
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    // If content exceeds single A4 page height, scale or add pages appropriately
    let heightLeft = pdfHeight;
    let position = 0;
    const pageHeight = pdf.internal.pageSize.getHeight();

    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    const safeParty = (bill.customer.partyName || 'ग्राहक').replace(/[/\\?%*:|"<>]/g, '_');
    const safeBillNo = (bill.customer.billNo || 'Bill').replace(/[/\\?%*:|"<>]/g, '_');
    const fileName = `RDS_Studio_${safeBillNo}_${safeParty}.pdf`;

    pdf.save(fileName);

    if (onComplete) onComplete();
  } catch (err: any) {
    console.error('PDF generation error:', err);
    if (onError) onError(err);
  }
}
