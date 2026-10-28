# saveprincetonoa.com

Static site for the alumni campaign to keep Outdoor Action in Princeton's first-year Orientation. Hosted on GitHub Pages; signatures are stored in a Google Sheet through a small Google Apps Script.

```
index.html            all page content (actions, letter, research, coverage, FAQ)
config.js             settings: signature endpoint, letter on/off, Google Group link, contact email
assets/styles.css     design
assets/app.js         copy buttons, signature form, signer list
assets/topo.svg       header contour artwork
assets/og-image.png   preview image for links shared by text/email/social
assets/favicon.svg
apps-script/Code.gs   signature backend (paste into Google Apps Script)
CNAME                 tells GitHub Pages to serve saveprincetonoa.com
```

To preview locally: `python3 -m http.server` in this folder, then open http://localhost:8000. Until the endpoint is set, the form runs in demo mode and saves nothing.

---

## 1. Connect the signature sheet (about 10 minutes)

1. Create a new Google Sheet (e.g. "OA open letter signatures") in the Google account that should own the data.
2. In the sheet: **Extensions → Apps Script**. Delete the starter code, paste in all of `apps-script/Code.gs`, and save.
3. In the function dropdown at the top, pick **setup** and click **Run**. Approve the permissions prompt (Google will warn that the app is unverified; choose *Advanced → Go to project*). A "Signatures" tab with headers appears in the sheet.
4. **Deploy → New deployment**. Gear icon → **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
   Click **Deploy** and copy the **Web app URL** (ends in `/exec`).
5. Paste that URL into `config.js` as `signatureEndpoint`.

Moderating:
- To remove a signature from the site, tick its **Hidden** box. It disappears within a minute.
- To approve every signature before it shows, set `REQUIRE_APPROVAL = true` in the script, then tick **Approved** on each row.
- Each email can sign once; signing again updates the existing row.
- If you change the script later, use **Deploy → Manage deployments → Edit → New version** so the URL stays the same.

## 2. Publish on GitHub Pages

1. Create a repository on GitHub (e.g. `saveprincetonoa`). Public is required on free accounts.
2. Upload everything in this folder to the repository root (GitHub's "Add file → Upload files" works, or `git push`).
3. Repository **Settings → Pages**: Source **Deploy from a branch**, branch **main**, folder **/ (root)**. Save.
4. Under **Custom domain**, enter `saveprincetonoa.com` (the `CNAME` file already contains it).

## 3. Point the Namecheap domain at GitHub

Namecheap → **Domain List → Manage → Advanced DNS**. Delete the default parking records, then add:

| Type | Host | Value |
|---|---|---|
| A Record | @ | 185.199.108.153 |
| A Record | @ | 185.199.109.153 |
| A Record | @ | 185.199.110.153 |
| A Record | @ | 185.199.111.153 |
| CNAME Record | www | YOUR-GITHUB-USERNAME.github.io. |

DNS can take up to an hour or so. Once GitHub Pages shows the domain as verified, tick **Enforce HTTPS** (the certificate may take a little while to issue).

Recommended: verify the domain in your GitHub account (**Settings → Pages → Add a domain**) so nobody else can claim it for their own Pages site.

## 4. Contact email

The site lists `saveprincetonoa@gmail.com` (set by `contactEmail` in `config.js`).

---

## Everyday edits

- **Post the open letter:** paste the text into the `id="letter-final"` block in `index.html`, then set `letterReady: true` in `config.js`. The form heading becomes "Co-sign this letter".
- **Google Group link:** set `googleGroupUrl` in `config.js`.
- **New coverage:** add an `<li>` to the list under `id="coverage"` in `index.html`.
- **Action items, FAQ, research:** plain HTML in `index.html`; each item is its own `<article>` or `<details>` block.

Note for the open letter: the *Daily Princetonian* asks that open letters be sent to opinion@dailyprincetonian.com **before** signatures are gathered (text first, then the signature form after editing), and it requires disclosure of any generative AI use in a submission.
