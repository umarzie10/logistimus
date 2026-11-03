const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });

  // 1. Mobile Menu Open
  const pageMobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await pageMobile.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await pageMobile.waitForTimeout(600);

  // Click hamburger button to open mobile nav
  await pageMobile.locator('button[aria-label="Open menu"]').click();
  await pageMobile.waitForTimeout(400);
  await pageMobile.screenshot({ path: "/home/SardorDev2010/Desktop/Logistimus/Frontend/tests/shot-mobile-menu-compact.png" });
  console.log("✓ Captured compact mobile menu");

  // 2. Desktop Compact Footer
  const pageDesktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await pageDesktop.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await pageDesktop.waitForTimeout(600);
  const footer = pageDesktop.locator("#footer");
  await footer.scrollIntoViewIfNeeded();
  await pageDesktop.waitForTimeout(300);
  await footer.screenshot({ path: "/home/SardorDev2010/Desktop/Logistimus/Frontend/tests/shot-footer-minimal.png" });
  console.log("✓ Captured minimal footer");

  await browser.close();
  console.log("All verifications done!");
})();
