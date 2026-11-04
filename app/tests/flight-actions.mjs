/** Expose the menu and, when requested, activate the flight controls panel. */
export async function prepareFlightUI(page, { controls = true } = {}) {
  const scene = page.locator('#scene');
  if (!(await page.locator('.topbar').isVisible())) {
    await scene.focus();
    await page.keyboard.press('i');
  }
  if (controls) {
    const panel = page.locator('#flight-controls-panel');
    if (!(await panel.isVisible())) {
      await scene.focus();
      await page.keyboard.press('Alt+Shift+f');
    }
    if (!(await panel.evaluate(element => element.classList.contains('overlay-active')))) {
      await panel.locator('.control-heading').click();
    }
  }
}

/** Start from the gate; resume through Space if the header is hidden. */
export async function startOrResume(page) {
  const start = page.locator('#start');
  if (await start.isVisible()) await start.click();
  else if (await page.locator('#pause').isVisible()) await page.locator('#pause').click();
  else { await page.locator('#scene').focus(); await page.keyboard.press('Space'); }
}

/** Deterministic scenery fixtures for UI/physics checks, not photo-source evidence. */
const fixturePages = new WeakSet();
export async function installSceneryFixture(page) {
  if (fixturePages.has(page)) return;
  fixturePages.add(page);
  const {deflateSync}=await import('node:zlib');
  const crc32=b=>{let c=0xffffffff;for(const n of b){c^=n;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;};
  const chunk=(name,data)=>{const type=Buffer.from(name),head=Buffer.alloc(4),tail=Buffer.alloc(4);head.writeUInt32BE(data.length);tail.writeUInt32BE(crc32(Buffer.concat([type,data])));return Buffer.concat([head,type,data,tail]);};
  const png=size=>{const h=Buffer.alloc(13);h.writeUInt32BE(size);h.writeUInt32BE(size,4);h[8]=8;h[9]=6;const raw=Buffer.alloc((size*4+1)*size);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const p=y*(size*4+1)+1+x*4;raw[p]=70;raw[p+1]=100;raw[p+2]=65;raw[p+3]=255;}return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',h),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);};
  const map=png(256),photo=png(512);
  await page.route('**/scenery/**',route=>new URL(route.request().url()).pathname.startsWith('/scenery/') ? route.fulfill({contentType:'image/png',body:route.request().url().includes('/imagery/')?photo:map}) : route.fallback());
}
