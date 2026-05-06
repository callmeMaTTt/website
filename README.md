# matt marinic — personal site

A minimal personal site with a warm, nostalgic European-summer feel — Fraunces serif headlines, terracotta accents, subtle film grain, and photographic banners. Vanilla HTML / CSS / JS, no build step.

## Edit content

All pages are plain HTML — open and edit:

- `index.html` — home / hero
- `2026.html` — current-year log
- `about.html` — about + timeline
- `blog.html` — blog index
- `contact.html` — contact links

Shared styles live in `styles.css`, theme toggle in `script.js`.

## Swap in your own photos

Each page has a `<div class="banner">` near the top using a placeholder gradient. Replace it with a real image:

```html
<!-- before -->
<div class="banner banner-terracotta"></div>

<!-- after -->
<div class="banner"><img src="/images/2026.jpg" alt=""></div>
```

Drop your photos into an `images/` folder (create it). For the warm, faded look, photos with these subjects work well:

- coffee + newspaper on a cafe table
- a stone village street at golden hour
- the mediterranean from a balcony
- linen, espresso cups, vespas, sun-bleached walls

The CSS automatically applies a slight desaturation + a soft dark gradient at the bottom so any text overlay stays legible.

For the hero portrait (`index.html`), replace `<div class="photo-frame">replace with photo</div>` with `<img src="/images/me.jpg" alt="">`.

## Customize the palette

In `styles.css` the warm palette lives at the top under `:root`:

- `--terracotta` — primary accent
- `--olive` / `--dusty-blue` / `--cream` — supporting tones
- `--bg` — warm near-black background

Light mode (cream paper) lives under `[data-theme="light"]`.

## Run locally

```sh
python3 -m http.server 8000
```

then visit <http://localhost:8000>.

## Deploy on Cloudflare Pages (free)

1. Push this repo to GitHub.
2. <https://dash.cloudflare.com/> → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Pick this repo and the branch.
4. **Build settings**: leave the build command **empty** and set the output directory to `/` — no build step.
5. **Save and Deploy** → free `*.pages.dev` URL with HTTPS.
6. Custom domain: **Custom domains** → enter your domain. Cloudflare handles SSL.

Every push to the deployed branch auto-deploys.
