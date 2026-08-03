export const PDF_RENDERER = Symbol('PDF_RENDERER');

export interface PdfRenderer {
  render(html: string): Promise<Buffer>;
}
