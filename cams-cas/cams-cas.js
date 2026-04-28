#!/usr/bin/env node

/**
 * CAMS CAS Automation
 *
 * Requests a Consolidated Account Statement (CAS) from camsonline.com
 * using headless Puppeteer. CAMS emails the password-protected PDF to
 * the investor's registered email.
 *
 * Usage:
 *   CAMS_EMAIL=investor@example.com CAMS_PASSWORD=MyPass@123 node cams-cas.js
 *
 * Environment variables:
 *   CAMS_EMAIL     — Investor's email registered in MF folios
 *   CAMS_PASSWORD  — Password to encrypt the PDF (min 6 chars)
 *
 * Exit codes:
 *   0  — Success (reference number printed to stdout as REF:<number>)
 *   1  — Failure
 *
 * License: MIT
 * Author: Aventryx (https://aventryx.in)
 */

const puppeteer = require("puppeteer");

const EMAIL = process.env.CAMS_EMAIL || "";
const PASSWORD = process.env.CAMS_PASSWORD || "";

if (!EMAIL || !PASSWORD) {
  console.error("Usage: CAMS_EMAIL=x CAMS_PASSWORD=y node cams-cas.js");
  process.exit(1);
}

const wait = ms => new Promise(r => setTimeout(r, ms));

function toDateStr(date) {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const d = String(date.getDate()).padStart(2, "0");
  return `${d}-${months[date.getMonth()]}-${date.getFullYear()}`;
}

async function fillInput(page, selector, value) {
  await page.evaluate((sel, val) => {
    const el = document.querySelector(sel);
    if (!el) return;
    el.focus();
    el.value = val;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("blur", { bubbles: true }));
  }, selector, value);
  await wait(300);
}

// Custom CAMS datepicker: open → year grid → pick year → pick month → pick day
async function pickDate(page, inputId, day, monthIndex, year) {
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const monthShort = months[monthIndex].substring(0, 3).toUpperCase();

  // Click the calendar icon
  await page.evaluate((id) => {
    const input = document.getElementById(id);
    let el = input.parentElement;
    for (let i = 0; i < 6; i++) {
      const btn = el.querySelector('button[aria-label="Open calendar"]');
      if (btn) { btn.click(); return; }
      el = el.parentElement;
    }
    input.click();
  }, inputId);
  await page.waitForSelector(".mat-calendar-body-cell-content", { timeout: 5000 });
  await wait(500);

  // One click goes to multi-year view
  await page.evaluate(() => {
    const btn = document.querySelector('[id^="mat-calendar-button"]');
    if (btn) btn.click();
  });
  await wait(600);

  // Navigate back until target year is visible
  for (let i = 0; i < 10; i++) {
    const found = await page.evaluate((y) =>
      Array.from(document.querySelectorAll(".mat-calendar-body-cell-content"))
        .some(e => e.textContent.trim() === String(y))
    , year);
    if (found) break;
    await page.evaluate(() => {
      const btn = document.querySelector("button.mat-calendar-previous-button");
      if (btn) btn.click();
    });
    await wait(400);
  }

  // Click year → month → day
  await page.evaluate((y) => {
    const cell = Array.from(document.querySelectorAll(".mat-calendar-body-cell-content"))
      .find(e => e.textContent.trim() === String(y));
    if (cell) cell.click();
  }, year);
  await wait(500);

  await page.evaluate((m) => {
    const cell = Array.from(document.querySelectorAll(".mat-calendar-body-cell-content"))
      .find(e => e.textContent.trim().toUpperCase() === m);
    if (cell) cell.click();
  }, monthShort);
  await wait(500);

  await page.evaluate((d) => {
    const cell = Array.from(document.querySelectorAll(".mat-calendar-body-cell-content"))
      .find(e => e.textContent.trim() === String(d));
    if (cell) cell.click();
  }, day);
  await wait(500);
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
    args: ["--start-maximized", "--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  // Auto-close ad tabs
  const mainTarget = page.target();
  browser.on("targetcreated", async target => {
    if (target.type() === "page" && target !== mainTarget) {
      const p = await target.page();
      await p.close();
    }
  });
  page.on("dialog", async d => { await d.dismiss(); });

  console.log("Opening CAMS CAS page...");
  await page.goto(
    "https://www.camsonline.com/Investors/Statements/Consolidated-Account-Statement",
    { waitUntil: "networkidle2" }
  );
  await page.waitForSelector('input[value="summary"]', { timeout: 15000 });
  await wait(1500);

  // --- T&C popup ---
  const hasTC = await page.$eval('input[value="ACCEPT"]', e => {
    const r = e.getBoundingClientRect();
    return r.width > 0;
  }).catch(() => false);

  if (hasTC) {
    console.log("Accepting T&C...");
    await page.evaluate(() => document.querySelector('input[value="ACCEPT"]').click());
    await wait(400);
    await page.evaluate(() => {
      let el = document.querySelector('input[value="ACCEPT"]').parentElement;
      for (let i = 0; i < 10; i++) {
        const btn = el.querySelector('input[value="PROCEED"], button[type="button"]');
        if (btn) { btn.click(); return; }
        el = el.parentElement;
      }
    });
    await wait(1500);
  }

  // --- Close survey popup ---
  await wait(2000);
  await page.evaluate(() => {
    const x = document.querySelector(".close-icon.colsebanner, .close-icon");
    if (x) x.click();
  });
  await wait(500);

  // --- Select Detailed ---
  console.log("Selecting Detailed statement...");
  await page.evaluate(() => document.querySelector('input[value="detailed"]').click());
  await wait(1500);

  // --- Select Specific Period ---
  const hasSP = await page.evaluate(() => !!document.querySelector('input[value="SP"]'));
  if (hasSP) {
    await page.evaluate(() => document.querySelector('input[value="SP"]').click());
    await wait(1000);
  }

  // --- Fill dates via calendar picker ---
  await page.waitForSelector("#fromDate_new", { timeout: 8000 });
  console.log("Setting date range: 01-Jan-2000 → today...");
  await pickDate(page, "fromDate_new", 1, 0, 2000);

  const today = new Date();
  await pickDate(page, "to-date-input", today.getDate(), today.getMonth(), today.getFullYear());

  // --- Folio: With zero balance ---
  await page.evaluate(() => document.querySelector('input[value="N"]').click());

  // --- Email + Password ---
  console.log("Filling form...");
  await fillInput(page, "#mat-input-0", EMAIL);
  await fillInput(page, "#password", PASSWORD);
  await fillInput(page, "#confirmPassword", PASSWORD);

  // --- Submit ---
  console.log("Submitting...");
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.trim() === "Submit");
    if (btn) btn.click();
  });

  // --- Poll for result (success page appears briefly then redirects) ---
  // 200ms cadence × 75 iterations = 15s budget. Fast enough to catch the
  // success card before CAMS redirects back to the statement list page.
  let result = { reference: null, isSuccess: false, text: "" };
  for (let i = 0; i < 75; i++) {
    await wait(200);
    const check = await page.evaluate(() => {
      const text = document.body.innerText;
      // Primary: "reference number is CP123456789" — most reliable marker
      const refAlt = text.match(/reference\s*(?:number|no\.?)\s*(?:is\s*)?:?\s*([A-Z]{1,3}\d{8,})/i);
      // Fallback: any letter-prefixed reference number in body text
      const refMatch = text.match(/\b([CD][A-Z]?\d{8,})\b/);
      // Strong success: "Your CAS-CAMS ... reference number" — distinguishes from generic page text
      const hasSuccessText = /your\s+cas[- ]?cams.*reference\s+number/i.test(text);
      const hasSuccess = hasSuccessText || (text.toLowerCase().includes("success") && (refAlt || refMatch));
      const hasError = /\berror\b|\binvalid\b|\bfailed\b/i.test(text) && !hasSuccessText;
      return {
        reference: refAlt ? refAlt[1] : (refMatch ? refMatch[1] : null),
        isSuccess: hasSuccess,
        isDone: hasSuccess || hasError,
        text: text.substring(0, 800)
      };
    });
    // Always keep latest snapshot so PAGE: log isn't empty when polling times out
    result = check;
    if (check.isDone || check.reference) {
      break;
    }
  }

  if (result.reference) {
    console.log("REF:" + result.reference);
  }
  // Reference number is the most reliable success signal
  if (result.isSuccess || result.reference) {
    console.log("STATUS:SUCCESS");
    console.log(`CAS will be emailed to the registered email for ${EMAIL}`);
  } else {
    console.log("STATUS:FAILED");
    console.error("Submission may have failed. Page text:", result.text.substring(0, 300));
    process.exitCode = 1;
  }

  await browser.close();
}

main().catch(err => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
