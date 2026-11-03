/** Archived synthetic NAV regression only. No LAB control ships in the app. */
export async function installLegacyLabFixture(page) {
  await page.route('**/src/main.ts', async route => {
    const response = await route.fetch();
    const source = await response.text();
    await route.fulfill({ response, body: source + `
window.__legacyLabFixture = {
  set(enabled) {
    if (!controlsAvailable()) throw new Error('Legacy NAV fixture requires live controls');
    const config = { ...radioPanel.snapshot(), radio_demo_enabled: enabled ? 1 : 0 };
    radioPanel.setConfiguration(config); session.setNavigation(config);
    latest = { ...latest, ...config };
  },
  enabled() {
    const shown = reviewing ? recordedTrace().atTime(reviewTime_s)?.state : radioPanel.snapshot();
    return shown?.radio_demo_enabled === 1;
  }
};
` });
  });
}
export async function setLegacyLab(page, enabled) {
  await page.evaluate(enabled => window.__legacyLabFixture.set(enabled), enabled);
}
export async function legacyLabEnabled(page) {
  return page.evaluate(() => window.__legacyLabFixture.enabled());
}
