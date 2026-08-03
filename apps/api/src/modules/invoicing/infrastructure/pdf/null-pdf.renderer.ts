import { Injectable } from '@nestjs/common';
import { PdfRenderer } from '../../application/ports/pdf-renderer.port';

// Selected when PUPPETEER_EXECUTABLE_PATH is blank (dev, and
// invoicing.int-spec.ts) — same "blank config selects the null adapter"
// pattern as StorageModule and the Midtrans stub gateway. Returns a
// minimal but structurally valid single-page PDF so callers that persist
// or serve the bytes don't need a special case.
@Injectable()
export class NullPdfRenderer implements PdfRenderer {
  async render(_html: string): Promise<Buffer> {
    return Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF');
  }
}
