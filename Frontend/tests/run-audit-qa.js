const { chromium } = require("playwright");

const BREAKPOINTS = [
  { name: "desktop-xl", width: 1440, height: 900 },
  { name: "desktop-lg", width: 1280, height: 800 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile-large", width: 390, height: 844 },
  { name: "mobile-small", width: 360, height: 740 },
];

const ROUTES = [
  "/",
  "/dashboard",
  "/orders",
  "/dispatch",
  "/fleet",
  "/drivers",
  "/warehouse",
  "/crm",
  "/finance",
  "/analytics",
  "/pricing",
  "/portal",
  "/driver",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/notifications",
];

(async () => {
  console.log("Starting Logistimus Frontend QA Audit Sweep...\n");
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  
  const results = {
    testedRoutes: ROUTES.length,
    breakpoints: BREAKPOINTS.length,
    consoleErrors: [],
    overflowIssues: [],
    successfulPasses: 0,
  };

  for (const bp of BREAKPOINTS) {
    console.log(`Testing breakpoint: ${bp.name} (${bp.width}x${bp.height})`);
    const context = await browser.newContext({
      viewport: { width: bp.width, height: bp.height },
    });
    const page = await context.newPage();

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        results.consoleErrors.push({
          breakpoint: bp.name,
          text: msg.text(),
        });
      }
    });

    for (const route of ROUTES) {
      try {
        const url = `http://localhost:3000${route}`;
        const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
        const status = response ? response.status() : "none";
        
        if (status !== 200) {
          console.error(`  [FAIL] ${route} returned status ${status}`);
          continue;
        }

        // Check horizontal overflow (no sideways scroll)
        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });

        if (hasHorizontalScroll) {
          results.overflowIssues.push({ route, breakpoint: bp.name, width: bp.width });
          console.warn(`  [WARN] Horizontal overflow detected on ${route} @ ${bp.width}px`);
        } else {
          results.successfulPasses++;
        }
      } catch (err) {
        console.error(`  [ERROR] on ${route} @ ${bp.name}:`, err.message);
      }
    }
    await context.close();
  }

  // Interactive Test on Key Controls
  console.log("\nTesting Critical Interactions on desktop...");
  const interactiveContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const interactivePage = await interactiveContext.newPage();

  // 1. Test Portal Search
  await interactivePage.goto("http://localhost:3000/portal", { waitUntil: "networkidle" });
  await interactivePage.fill('input[placeholder*="Tracking"]', "ORD-24101");
  await interactivePage.click('button:has-text("Track Shipment")');
  const hasShipmentId = await interactivePage.isVisible('text="ORD-24101"');
  console.log(`  Portal tracking ORD-24101: ${hasShipmentId ? "PASS" : "FAIL"}`);

  // Test not-found
  await interactivePage.fill('input[placeholder*="Tracking"]', "UNKNOWN-999");
  await interactivePage.click('button:has-text("Track Shipment")');
  const hasNotFound = await interactivePage.isVisible('text="Shipment Not Found"');
  console.log(`  Portal tracking unknown item: ${hasNotFound ? "PASS" : "FAIL"}`);

  // 2. Test Orders Export CSV button
  await interactivePage.goto("http://localhost:3000/orders", { waitUntil: "networkidle" });
  const downloadPromise = interactivePage.waitForEvent("download", { timeout: 5000 }).catch(() => null);
  await interactivePage.click('button:has-text("Export CSV")');
  const download = await downloadPromise;
  console.log(`  Orders CSV Export trigger: ${download ? "PASS" : "FAIL"}`);

  // 3. Test Dashboard Live Map Refresh
  await interactivePage.goto("http://localhost:3000/dashboard", { waitUntil: "networkidle" });
  await interactivePage.click('button[aria-label="Refresh live fleet map"]');
  await interactivePage.waitForTimeout(600);
  const updatedText = await interactivePage.textContent('span:has-text("Updated")');
  console.log(`  Dashboard live map refresh: ${updatedText ? "PASS" : "FAIL"}`);

  // 4. Test CRM Add Customer Modal
  await interactivePage.goto("http://localhost:3000/crm", { waitUntil: "networkidle" });
  await interactivePage.click('button:has-text("Add New Customer")');
  const modalVisible = await interactivePage.isVisible('text="Onboard New Enterprise Account"');
  console.log(`  CRM Add Customer modal: ${modalVisible ? "PASS" : "FAIL"}`);

  // 5. Test Settings Key Rotate Notice
  await interactivePage.goto("http://localhost:3000/settings", { waitUntil: "networkidle" });
  await interactivePage.click('button:has-text("Rotate Key")');
  const noticeVisible = await interactivePage.isVisible('text="Backend required"');
  console.log(`  Settings Rotate Key notice: ${noticeVisible ? "PASS" : "FAIL"}`);

  await interactiveContext.close();
  await browser.close();

  console.log("\n=================================");
  console.log("QA AUDIT SUMMARY");
  console.log("=================================");
  console.log(`Total Passes: ${results.successfulPasses} / ${ROUTES.length * BREAKPOINTS.length}`);
  console.log(`Console Errors: ${results.consoleErrors.length}`);
  console.log(`Overflow Issues: ${results.overflowIssues.length}`);
  if (results.overflowIssues.length > 0) {
    console.log("Overflows:", results.overflowIssues);
  }
  console.log("=================================\n");
})();
