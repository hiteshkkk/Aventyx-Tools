# CAMS CAS Automation

Headless Puppeteer script to request a **CAS (Consolidated Account Statement)** from [camsonline.com](https://www.camsonline.com/Investors/Statements/Consolidated-Account-Statement). CAMS + KFintech emails the password-protected PDF to the investor's registered email.

## What is CAS?

A **Consolidated Account Statement** is a single document showing all mutual fund holdings across all AMCs (Asset Management Companies) for a given PAN/email. It's issued jointly by CAMS and KFintech — the two registrars that together cover 100% of Indian mutual funds.

## Install

```bash
cd cams-cas
npm install
```

Requires Node.js 18+ and Puppeteer 24+.

## Usage

```bash
CAMS_EMAIL=investor@example.com CAMS_PASSWORD=MyPass@123 node cams-cas.js
```

| Variable | Description |
|----------|-------------|
| `CAMS_EMAIL` | Email registered in the investor's MF folios |
| `CAMS_PASSWORD` | Password to encrypt the PDF (min 6 chars) |

### Output

```
Opening CAMS CAS page...
Accepting T&C...
Selecting Detailed statement...
Setting date range: 01-Jan-2000 → today...
Filling form...
Submitting...
REF:CP209528027
STATUS:SUCCESS
CAS will be emailed to the registered email for investor@example.com
```

The reference number (`REF:CP...`) can be parsed from stdout for programmatic use.

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success — CAS request submitted |
| `1` | Failure — check stderr for details |

## How it works

1. Opens the CAMS CAS page in headless Chrome
2. Accepts T&C popup and dismisses survey popup
3. Selects **Detailed** statement type
4. Sets date range: **01-Jan-2000 → today** (since inception)
5. Selects **With zero balance folios**
6. Fills email and PDF password
7. Submits the form
8. Polls the result page for the reference number before it redirects

## Integration example

```js
const { exec } = require("child_process");

function requestCAS(email, password) {
  return new Promise((resolve, reject) => {
    exec(
      `node cams-cas.js`,
      {
        env: { ...process.env, CAMS_EMAIL: email, CAMS_PASSWORD: password },
        timeout: 120000,
      },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || err.message));
        const ref = stdout.match(/REF:([A-Z0-9]+)/);
        resolve({
          success: stdout.includes("STATUS:SUCCESS"),
          reference: ref ? ref[1] : null,
        });
      }
    );
  });
}

// Usage
const result = await requestCAS("investor@example.com", "MyPass@123");
console.log(result); // { success: true, reference: "CP209528027" }
```

## Known quirks

| Issue | How it's handled |
|-------|-----------------|
| T&C popup on first visit | Auto-accepted |
| Survey/ad popup | Auto-closed via `.close-icon` |
| Ad tabs opening | Auto-closed via `targetcreated` event |
| Angular Material datepicker rejects typed input | Navigated via DOM clicks through the calendar |
| Success page redirects after ~3 seconds | Polled every 500ms to capture reference before redirect |
| reCAPTCHA | Invisible reCAPTCHA only — handled transparently |

## Important notes

- CAMS sends the CAS to the **email registered in the investor's folio**, not the email typed in the form. The form email is used for validation only.
- The script requests a **Detailed** statement with **zero balance folios** for the **entire history** (since Jan 2000).
- Rate limiting: if making bulk requests, add a 3-5 second delay between requests to avoid IP throttling.

## License

MIT

Built by [Aventryx](https://aventryx.in) — the Financial OS for Indian financial advisors.
