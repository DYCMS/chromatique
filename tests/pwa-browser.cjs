/* Vérifie les fichiers réellement servis et le manifeste analysé par Chromium. */
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  let server;
  let browser;
  try {
    let base = process.env.CHROMATIQUE_URL;
    if (!base) {
      const root = path.resolve(__dirname, '..');
      const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
      server = http.createServer(async (req, res) => {
        const pathname = new URL(req.url, 'http://localhost').pathname;
        if (!pathname.startsWith('/chromatique/')) { res.writeHead(404).end(); return; }
        const relative = pathname.slice('/chromatique/'.length) || 'index.html';
        const file = path.resolve(root, relative);
        if (!file.startsWith(root + path.sep)) { res.writeHead(404).end(); return; }
        try {
          const data = await fs.readFile(file);
          res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }).end(data);
        } catch { res.writeHead(404).end(); }
      });
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
      base = `http://127.0.0.1:${server.address().port}/chromatique/`;
    }
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 393, height: 851 }, isMobile: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const response = await page.goto(base);
    assert.equal(response.status(), 200);
    await page.waitForFunction(() => Boolean(window.codeSecret));
    const cdp = await context.newCDPSession(page);
    const parsed = await cdp.send('Page.getAppManifest');
    assert.ok(parsed.url.endsWith('/chromatique/manifest.webmanifest'));
    assert.deepEqual(parsed.errors, []);
    const manifest = JSON.parse(parsed.data);
    const scope = new URL('./', page.url()).href;
    assert.equal(new URL(manifest.id, parsed.url).href, scope);
    assert.equal(new URL(manifest.start_url, parsed.url).href, scope);
    assert.equal(new URL(manifest.scope, parsed.url).href, scope);
    assert.equal(manifest.short_name, 'Chromatique');
    assert.equal(manifest.display, 'standalone');
    assert.equal(new URL(manifest.start_url, parsed.url).search, '');
    assert.deepEqual(manifest.icons.map(icon => icon.sizes).sort(), ['192x192', '512x512']);
    assert.ok(manifest.icons.some(icon => icon.purpose.split(' ').includes('maskable')));
    const icons = manifest.icons.map(icon => ({ url: new URL(icon.src, parsed.url).href, size: Number(icon.sizes.split('x')[0]) }));
    for (const [selector, size] of [['link[rel="apple-touch-icon"]', 180], ['link[rel="icon"]', 32]]) {
      icons.push({ url: await page.locator(selector).evaluate(link => link.href), size });
    }
    for (const icon of icons) {
      const image = await context.request.get(icon.url);
      assert.equal(image.status(), 200, icon.url);
      assert.match(image.headers()['content-type'], /image\/png/);
      const buffer = await image.body();
      assert.equal(buffer.subarray(1, 4).toString(), 'PNG');
      assert.equal(buffer.readUInt32BE(16), icon.size);
      assert.equal(buffer.readUInt32BE(20), icon.size);
      const dimensions = await page.evaluate(async url => {
        const image = new Image(); image.src = url; await image.decode();
        return [image.naturalWidth, image.naturalHeight];
      }, icon.url);
      assert.deepEqual(dimensions, [icon.size, icon.size]);
    }
    assert.deepEqual(errors, []);
    console.log('Installation mobile : manifeste accepté par Chromium, chemins Pages et quatre icônes PNG vérifiés.');
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
