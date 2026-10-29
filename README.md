# saveprincetonoa.com

Static site for the alumni campaign to keep Outdoor Action in Princeton's first-year Orientation. Hosted on GitHub Pages; messages of support are stored in a Google Sheet through a small Google Apps Script.

```
index.html            all page content (actions, messages of support, research, coverage, FAQ)
config.js             settings: message endpoint, Google Group link, contact email
assets/styles.css     design
assets/app.js         copy buttons, message form, message list
assets/topo.svg       header contour artwork
assets/og-image.png   preview image for links shared by text/email/social
assets/favicon.svg
apps-script/Code.gs   message backend (paste into Google Apps Script)
CNAME                 tells GitHub Pages to serve saveprincetonoa.com
```

To preview locally: `python3 -m http.server` in this folder, then open http://localhost:8000. Until the endpoint is set, the form runs in demo mode and saves nothing.

---

## 1. Connect the message sheet (about 10 minutes)

1. Create a new Google Sheet (e.g. "OA messages of support") in the Google account that should own the data.
2. In the sheet: **Extensions → Apps Script**. Delete the starter code, paste in all of `apps-script/Code.gs`, and save.
3. In the function dropdown at the top, pick **setup** and click **Run**. Approve the permissions prompt (Google will warn that the app is unverified; choose *Advanced → Go to project*). A "Signatures" tab with headers appears in the sheet.
4. **Deploy → New deployment**. Gear icon → **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
   Click **Deploy** and copy the **Web app URL** (ends in `/exec`).
5. Paste that URL into `config.js` as `signatureEndpoint`.

Moderating:
- To remove a message from the site, tick its **Hidden** box. It disappears within a minute.
- To approve every message before it shows, set `REQUIRE_APPROVAL = true` in the script, then tick **Approved** on each row.
- Each email address is kept once; later submissions with the same address are ignored (so no one can overwrite another person's entry). To correct an entry, edit the sheet directly.
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

- **Google Group link:** set `googleGroupUrl` in `config.js`.
- **New coverage:** add an `<li>` to the list under `id="coverage"` in `index.html`.
- **Action items, FAQ, research:** plain HTML in `index.html`; each item is its own `<article>` or `<details>` block.

