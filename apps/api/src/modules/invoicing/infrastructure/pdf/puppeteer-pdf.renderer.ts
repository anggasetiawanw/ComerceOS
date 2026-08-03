import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import puppeteer, { Browser } from 'puppeteer-core';
import { AppConfigService } from '../../../../shared/config/app-config.service';
import { PdfRenderer } from '../../application/ports/pdf-renderer.port';

// One lazily-launched browser per worker process, reused across renders —
// launching Chromium per render costs hundreds of ms. Only newPage()/
// page.close() happen per render; the browser itself closes on
// onModuleDestroy. The `invoice` queue's concurrency of 2 caps concurrent
// pages at 2 (.docs/00-product-analysis.md §7 flags Puppeteer's memory
// profile — this is the mitigation).
@Injectable()
export class PuppeteerPdfRenderer implements PdfRenderer, OnModuleDestroy {
  private readonly logger = new Logger(PuppeteerPdfRenderer.name);
  private browserPromise: Promise<Browser> | null = null;

  constructor(private readonly config: AppConfigService) {}

  async render(html: string): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '24px', bottom: '24px', left: '24px', right: '24px' },
      });
      return Buffer.from(pdf);
    } finally {
      await page.close();
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.browserPromise) return;
    const browser = await this.browserPromise;
    await browser.close();
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browserPromise) {
      this.logger.log(`Launching Chromium at ${this.config.puppeteerExecutablePath}`);
      this.browserPromise = puppeteer.launch({
        executablePath: this.config.puppeteerExecutablePath,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }
    return this.browserPromise;
  }
}
