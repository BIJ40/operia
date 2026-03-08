/**
 * PDF rendering logic for admin backup exports.
 * Extracted from use-admin-backup.ts to eliminate duplication
 * between exportSingleCategoryPdf and exportMultipleCategoriesPdf.
 * No behavioral change.
 */

import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/logger';

interface PdfContext {
  pdf: import('jspdf').jsPDF;
  margin: number;
  contentWidth: number;
  pageHeight: number;
  yPosition: number;
}

function checkPageBreak(ctx: PdfContext, requiredHeight: number): boolean {
  if (ctx.yPosition + requiredHeight > ctx.pageHeight - ctx.margin) {
    ctx.pdf.addPage();
    ctx.yPosition = ctx.margin;
    return true;
  }
  return false;
}

async function loadImageAsBase64(imgSrc: string): Promise<string | null> {
  // Check if it's a Supabase storage URL
  const supabaseStorageMatch = imgSrc.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)/);

  if (supabaseStorageMatch) {
    const bucketName = supabaseStorageMatch[1];
    const filePath = decodeURIComponent(supabaseStorageMatch[2].split('?')[0]);

    const { data: blobData, error } = await supabase.storage
      .from(bucketName)
      .download(filePath);

    if (!error && blobData) {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blobData);
      });
    }
    return null;
  }

  // External URL
  try {
    const response = await fetch(imgSrc, { mode: 'cors' });
    if (response.ok) {
      const blob = await response.blob();
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    }
  } catch {
    // Silent fail for CORS issues
  }
  return null;
}

async function renderImage(ctx: PdfContext, imgSrc: string): Promise<void> {
  try {
    const base64 = await loadImageAsBase64(imgSrc);
    if (!base64) return;

    const img = new Image();
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = base64;
    });

    if (img.width > 0 && img.height > 0) {
      const maxWidth = ctx.contentWidth;
      const maxHeight = 100;
      let imgWidth = img.width * 0.264583;
      let imgHeight = img.height * 0.264583;

      if (imgWidth > maxWidth) {
        const ratio = maxWidth / imgWidth;
        imgWidth = maxWidth;
        imgHeight *= ratio;
      }
      if (imgHeight > maxHeight) {
        const ratio = maxHeight / imgHeight;
        imgHeight = maxHeight;
        imgWidth *= ratio;
      }

      checkPageBreak(ctx, imgHeight + 10);
      const format = base64.includes('image/png') ? 'PNG' : 'JPEG';
      ctx.pdf.addImage(base64, format, ctx.margin, ctx.yPosition, imgWidth, imgHeight);
      ctx.yPosition += imgHeight + 8;
    }
  } catch (imgError) {
    logError('backup-pdf-renderer', 'Erreur chargement image PDF', imgError);
  }
}

/** Recursively process an HTML DOM node into PDF content */
export async function processNodeToPdf(ctx: PdfContext, node: Node): Promise<void> {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent?.trim();
    if (text) {
      ctx.pdf.setFontSize(11);
      ctx.pdf.setFont('helvetica', 'normal');
      const lines = ctx.pdf.splitTextToSize(text, ctx.contentWidth);
      checkPageBreak(ctx, lines.length * 5 + 3);
      ctx.pdf.text(lines, ctx.margin, ctx.yPosition);
      ctx.yPosition += lines.length * 5 + 3;
    }
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as HTMLElement;
    const tagName = element.tagName.toLowerCase();

    if (tagName === 'img') {
      const imgSrc = element.getAttribute('src');
      if (imgSrc) await renderImage(ctx, imgSrc);
    } else if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3') {
      const text = element.textContent?.trim();
      if (text) {
        checkPageBreak(ctx, 15);
        const fontSize = tagName === 'h1' ? 14 : tagName === 'h2' ? 13 : 12;
        ctx.pdf.setFontSize(fontSize);
        ctx.pdf.setFont('helvetica', 'bold');
        const lines = ctx.pdf.splitTextToSize(text, ctx.contentWidth);
        ctx.pdf.text(lines, ctx.margin, ctx.yPosition);
        ctx.yPosition += lines.length * 6 + 5;
      }
    } else if (tagName === 'p') {
      const text = element.textContent?.trim();
      if (text) {
        ctx.pdf.setFontSize(11);
        ctx.pdf.setFont('helvetica', 'normal');
        const lines = ctx.pdf.splitTextToSize(text, ctx.contentWidth);
        checkPageBreak(ctx, lines.length * 5 + 5);
        ctx.pdf.text(lines, ctx.margin, ctx.yPosition);
        ctx.yPosition += lines.length * 5 + 5;
      }
    } else if (tagName === 'ul' || tagName === 'ol') {
      const listItems = element.querySelectorAll(':scope > li');
      let itemIndex = 1;
      for (const li of Array.from(listItems)) {
        const text = li.textContent?.trim();
        if (text) {
          const bullet = tagName === 'ul' ? '•' : `${itemIndex}.`;
          ctx.pdf.setFontSize(11);
          ctx.pdf.setFont('helvetica', 'normal');
          const lines = ctx.pdf.splitTextToSize(`${bullet} ${text}`, ctx.contentWidth - 5);
          checkPageBreak(ctx, lines.length * 5 + 2);
          ctx.pdf.text(lines, ctx.margin + 5, ctx.yPosition);
          ctx.yPosition += lines.length * 5 + 2;
          itemIndex++;
        }
      }
      ctx.yPosition += 3;
    } else if (tagName === 'table') {
      const rows = element.querySelectorAll('tr');
      for (const row of Array.from(rows)) {
        const cells = row.querySelectorAll('td, th');
        const rowText = Array.from(cells).map(c => c.textContent?.trim()).join(' | ');
        if (rowText) {
          ctx.pdf.setFontSize(10);
          ctx.pdf.setFont('helvetica', 'normal');
          const lines = ctx.pdf.splitTextToSize(rowText, ctx.contentWidth);
          checkPageBreak(ctx, lines.length * 4 + 2);
          ctx.pdf.text(lines, ctx.margin, ctx.yPosition);
          ctx.yPosition += lines.length * 4 + 2;
        }
      }
      ctx.yPosition += 5;
    } else {
      for (const child of Array.from(element.childNodes)) {
        await processNodeToPdf(ctx, child);
      }
    }
  }
}

/** Render a title page for a category PDF */
export function renderTitlePage(
  ctx: PdfContext,
  guideTitle: string,
  categoryTitle: string,
  sectionCount: number,
): void {
  const pageWidth = ctx.pdf.internal.pageSize.getWidth();
  ctx.pdf.setFontSize(24);
  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.text(guideTitle, pageWidth / 2, 50, { align: 'center' });

  ctx.pdf.setFontSize(18);
  ctx.pdf.text(categoryTitle, pageWidth / 2, 70, { align: 'center' });

  ctx.pdf.setFontSize(12);
  ctx.pdf.setFont('helvetica', 'normal');
  ctx.pdf.text(`Export du ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, 85, { align: 'center' });
  ctx.pdf.text(`${sectionCount} section(s)`, pageWidth / 2, 92, { align: 'center' });
}

/** Render all sections of a category into the current PDF */
export async function renderSectionsToPdf(
  ctx: PdfContext,
  sections: { title: string; content: string }[],
): Promise<void> {
  for (const section of sections) {
    ctx.pdf.addPage();
    ctx.yPosition = ctx.margin;

    ctx.pdf.setFontSize(16);
    ctx.pdf.setFont('helvetica', 'bold');
    const titleLines = ctx.pdf.splitTextToSize(section.title, ctx.contentWidth);
    ctx.pdf.text(titleLines, ctx.margin, ctx.yPosition);
    ctx.yPosition += titleLines.length * 8 + 5;

    ctx.pdf.setDrawColor(200, 200, 200);
    const pageWidth = ctx.pdf.internal.pageSize.getWidth();
    ctx.pdf.line(ctx.margin, ctx.yPosition, pageWidth - ctx.margin, ctx.yPosition);
    ctx.yPosition += 8;

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = section.content || '';

    for (const child of Array.from(tempDiv.childNodes)) {
      await processNodeToPdf(ctx, child);
    }
  }
}

/** Create a fresh PdfContext with standard A4 settings */
export function createPdfContext(pdf: import('jspdf').jsPDF): PdfContext {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  return {
    pdf,
    margin,
    contentWidth: pageWidth - margin * 2,
    pageHeight,
    yPosition: margin,
  };
}
