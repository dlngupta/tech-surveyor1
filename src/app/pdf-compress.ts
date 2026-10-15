import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const MAX_SIZE = 500 * 1024; // 500KB

export async function compressPdf(file: File): Promise<File> {
  if (file.size <= MAX_SIZE) return file;

  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdfDoc.numPages;

  let quality = 0.5;
  let scale = 1.2;
  let compressed: Uint8Array;

  // Try progressively lower quality until under 500KB
  for (let attempt = 0; attempt < 4; attempt++) {
    compressed = await renderPdfToCompressed(pdfDoc, numPages, scale, quality);
    if (compressed.byteLength <= MAX_SIZE) break;
    quality -= 0.1;
    scale -= 0.15;
    if (quality < 0.15) quality = 0.15;
    if (scale < 0.6) scale = 0.6;
  }

  const blob = new Blob([compressed!], { type: 'application/pdf' });
  return new File([blob], file.name, { type: 'application/pdf' });
}

async function renderPdfToCompressed(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  numPages: number,
  scale: number,
  quality: number
): Promise<Uint8Array> {
  const newPdf = await PDFDocument.create();

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;

    await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;

    const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
    const jpegBytes = Uint8Array.from(atob(jpegDataUrl.split(',')[1]), c => c.charCodeAt(0));

    const img = await newPdf.embedJpg(jpegBytes);
    const newPage = newPdf.addPage([viewport.width, viewport.height]);
    newPage.drawImage(img, {
      x: 0,
      y: 0,
      width: viewport.width,
      height: viewport.height,
    });
  }

  return await newPdf.save();
}
