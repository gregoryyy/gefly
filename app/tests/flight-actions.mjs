/** Initial Start is in the gate; subsequent Resume is the always-visible header action. */
export async function startOrResume(page) {
  const start = page.locator('#start');
  if (await start.isVisible()) await start.click();
  else await page.locator('#pause').click();
}
