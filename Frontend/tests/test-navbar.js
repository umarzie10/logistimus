const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // 1. Visit Home & click Sign In
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.locator('header a:has-text("Sign In")').first().click();
  await page.waitForURL("**/sign-in");
  console.log("✓ Successfully clicked Sign In -> navigated to /sign-in");
  await page.screenshot({ path: "/tmp/opencode/nav-test-signin.png" });

  // 2. Visit Home & click Pricing
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.locator('nav > ul > li > a:has-text("Pricing")').first().click();
  await page.waitForURL("**/pricing");
  console.log("✓ Successfully clicked Pricing -> navigated to /pricing");
  await page.screenshot({ path: "/tmp/opencode/nav-test-pricing.png" });

  // 3. Visit Home & click Get Started
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.locator('header a:has-text("Get Started")').first().click();
  await page.waitForURL("**/sign-up");
  console.log("✓ Successfully clicked Get Started -> navigated to /sign-up");
  await page.screenshot({ path: "/tmp/opencode/nav-test-signup.png" });

  // 4. Test dropdown navigation to Order Management
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.hover('nav button:has-text("Platform")');
  await page.waitForTimeout(300);
  await page.locator('a[role="menuitem"]:has-text("Order Management")').first().click();
  await page.waitForURL("**/orders");
  console.log("✓ Successfully clicked Platform > Order Management -> navigated to /orders");

  // 5. Test dropdown navigation to Fleet Management
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.hover('nav button:has-text("Platform")');
  await page.waitForTimeout(300);
  await page.locator('a[role="menuitem"]:has-text("Fleet Management")').first().click();
  await page.waitForURL("**/fleet");
  console.log("✓ Successfully clicked Platform > Fleet Management -> navigated to /fleet");

  await browser.close();
  console.log("ALL NAVBAR FLOWS VERIFIED 100% WORKING!");
})();
