// Drives the browser build headless and takes full-resolution screenshots: the
// browser half of the side-by-side comparison, with tools/scenario.gd the Godot
// half. Serve the parent directory on port 8765 first (any static server).
//   node godot-port/tools/shoot.js steps.json    (shots land next to the JSON)
// steps: [{wait:ms},{eval:"js"},{shot:"file.png"},{key:"Enter"},{click:"selector"},{type:"text"}]
const path = require('path');
const fs = require('fs');
const { chromium } = require(path.resolve(__dirname, '..', '..', 'node_modules', 'playwright'));

(async () => {
  const steps = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const outDir = path.dirname(path.resolve(process.argv[2]));
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
    // Playwright hides scrollbars in headless mode; a real window shows the
    // game's styled ones, and they take width from the layout.
    ignoreDefaultArgs: ['--hide-scrollbars'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', m => { if (m.type() === 'error') console.log('[console]', m.text()); });
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  const url = steps.url || 'http://localhost:8765/';
  await page.goto(url);
  for (const s of steps.steps || steps) {
    if (s.wait != null) await page.waitForTimeout(s.wait);
    if (s.eval != null) {
      try { const r = await page.evaluate(s.eval); if (r !== undefined) console.log('[eval]', JSON.stringify(r)); }
      catch (e) { console.log('[eval error]', e.message); }
    }
    if (s.key != null) await page.keyboard.press(s.key);
    if (s.hold != null) { await page.keyboard.down(s.hold); await page.waitForTimeout(s.ms || 300); await page.keyboard.up(s.hold); }
    if (s.click != null) { try { await page.click(s.click, { timeout: 3000 }); } catch (e) { console.log('[click error]', e.message); } }
    if (s.mouse != null) await page.mouse.click(s.mouse[0], s.mouse[1]);
    if (s.type != null) await page.keyboard.type(s.type);
    if (s.shot != null) { await page.screenshot({ path: path.join(outDir, s.shot) }); console.log('shot', s.shot); }
  }
  await browser.close();
})();
