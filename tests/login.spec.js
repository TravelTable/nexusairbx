import { test, expect } from '@playwright/test';

test.describe('Login and AI Feature Test', () => {
  test('should log in and navigate to AI feature', async ({ page }) => {
    // Load environment variables from .env.e2e
    require('dotenv').config({ path: '.env.e2e' });

    const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'; // Default to localhost if not set
    const E2E_EMAIL = process.env.E2E_EMAIL;
    const E2E_PASSWORD = process.env.E2E_PASSWORD;

    if (!E2E_EMAIL || !E2E_PASSWORD) {
      throw new Error('E2E_EMAIL and E2E_PASSWORD must be set in .env.e2e');
    }

    await page.goto(`${BASE_URL}/`);

    // Click the "Login" button in the header to open the login popup
    await page.click('button:has-text("Login")');

    // Fill the email and password fields in the login popup using placeholders
    await page.fill('input[placeholder="your.email@example.com"]', E2E_EMAIL);
    await page.fill('input[placeholder="********"]', E2E_PASSWORD);

    // Click the "Sign In to Workspace" button
    await page.click('button:has-text("Sign In To Workspace")');

    // Confirm successful login by checking for a redirect to /ai
    await page.waitForURL(`${BASE_URL}/ai`);
    await expect(page).toHaveURL(`${BASE_URL}/ai`);

    console.log('Successfully logged in and navigated to AI feature.');

    // --- Placeholder for AI evaluation ---
    // Capture page state
    const html = await page.content();
    // const screenshot = await page.screenshot({ encoding: 'base64' });
    // const consoleErrors = await page.evaluate(() => {
    //   return window.consoleErrors; // Assuming you capture console errors in the browser context
    // });
    // const failedNetworkRequests = await page.evaluate(() => {
    //   return window.failedNetworkRequests; // Assuming you capture failed network requests
    // });

    // Call your AI evaluator (pseudo-code)
    // const audit = await callAI({
    //   systemPrompt: `
    //     You are a UX & Accessibility Auditor for our web app.
    //     Analyse the following HTML snippet for contrast, tap targets, hierarchy and consistency.
    //     Return ONLY JSON with "score", "issues" and "suggestions".
    //   `,
    //   userPrompt: html
    // });

    // Handle audit feedback
    // if (audit.score < 70) {
    //   console.warn("Audit failed", audit.issues);
    //   // Optionally trigger self-healing or open a ticket
    //   expect(audit.score).toBeGreaterThanOrEqual(70); // Fail the test if score is too low
    // }
    // --- End Placeholder ---
  });
});
