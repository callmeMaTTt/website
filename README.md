# matt marinic — personal site

A minimal dark-themed personal site (vanilla HTML / CSS / JS).

## Edit content

All pages are plain HTML — open and edit:

- `index.html` — home / hero
- `2026.html` — current-year log
- `about.html` — about + timeline
- `blog.html` — blog index
- `contact.html` — contact links

Shared styles live in `styles.css`, theme toggle in `script.js`.

## Run locally

Just open `index.html` in a browser, or run a tiny static server:

```sh
python3 -m http.server 8000
```

then visit <http://localhost:8000>.

## Deploy on Cloudflare Pages (free)

1. Push this repo to GitHub.
2. Go to <https://dash.cloudflare.com/> → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Pick this repo and the branch.
4. **Build settings**: leave the build command **empty** and set the output directory to `/` (it's a static site, no build step).
5. **Save and Deploy**. You'll get a free `*.pages.dev` URL with HTTPS.
6. To use a custom domain: **Custom domains** → **Set up a custom domain** → enter your domain. Cloudflare handles SSL automatically.

Every push to the deployed branch auto-deploys.
