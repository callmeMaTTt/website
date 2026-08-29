# FSA UniMelb — website

A rebuild of [fsaunimelb.com](https://www.fsaunimelb.com) for the Finance
Students' Association, University of Melbourne. Static, no framework runtime,
built with [Astro](https://astro.build).

## Why it's fast

The old site was built on a hosted page builder, which ships a large JavaScript
runtime before it can render anything. This one ships almost nothing:

| | This build |
|---|---|
| First-load payload (home, gzipped) | **~80 KB**, fonts included |
| JavaScript | **~1 KB** (theme toggle, menu, hover prefetch) |
| Render-blocking requests | **1** stylesheet |
| Third-party connections | **0** |

Specifically:

- **Every page is pre-rendered HTML.** No client-side framework, no hydration.
- **Fonts are self-hosted and preloaded** from `public/fonts/`. No
  `fonts.googleapis.com` round trip, which otherwise costs two extra
  connections and blocks first paint.
- **One stylesheet**, fingerprinted and served `immutable` via `public/_headers`.
- **Scroll animations are pure CSS** (`animation-timeline: view()`), so there is
  no scroll listener and no animation library.
- **Links hover-prefetch**, so a second page is usually already in cache by the
  time it's clicked.

## Editing content

Most changes don't need a developer.

**Site-wide text, nav, contact emails, headline stats, sponsors** —
`src/data/site.ts`. One file, commented.

**Events** — add a markdown file to `src/content/events/`:

```markdown
---
title: Insights Into Quantitative Trading
date: 2026-09-17
time: '6:00pm – 8:30pm'
location: 'The Spot, Level 4 — Parkville'
summary: One or two sentences for the listing page.
tags: ['Careers', 'Markets']
registerUrl: https://example.com/tickets   # optional
---

The full write-up goes here, in plain markdown.
```

It appears on `/events` automatically and moves itself from **Upcoming** to
**Past** once the date passes. Set `published: false` to hide one without
deleting it. The filename becomes the URL: `my-event.md` → `/events/my-event`.

**Committee** — `src/content/team/committee.json`. Each entry takes `name`,
`role`, `group` (`executive` or `directors`), and optionally `photo` and
`linkedin`. Handover is one file edit.

**Committee photos** — drop images in `public/images/team/` and reference them
as `"photo": "/images/team/name.jpg"`. Without a photo, the card falls back to
the person's initials, so a part-finished page still looks deliberate.

**Sponsor logos** — drop them in `public/images/sponsors/` and add
`logo: '/images/sponsors/firm.svg'` to that sponsor in `src/data/site.ts`.
Without a logo it renders the firm's name as a wordmark.

## Dropping in the 3D assets

`src/components/Stage.astro` is the slot. Pass any real asset as a child and it
takes over automatically — the placeholder mark hides itself:

```astro
<Stage>
  <model-viewer src="/models/fsa.glb" camera-controls auto-rotate />
</Stage>
```

A `<canvas>`, `<img>` or `<video>` works the same way. Two things to keep the
site fast when they land:

1. **Load the 3D library lazily**, after first paint and only when the stage is
   actually in view — never as a blocking `<script>` in `<head>`.
2. **Keep the stage's `aspect-ratio`** so the layout doesn't shift while the
   asset loads.

Until then the placeholder is inline SVG: about 1 KB, no JS.

## Old URLs

`public/_redirects` 301s the previous site's paths (`/about-fsa`,
`/our-people`, `/past-events`, `/join-fsa`, `/contact-us`, `/event-details/*`
and others) to their new homes, so existing links and search rankings carry
over. Add a line there for any path this misses.

## Run locally

```sh
npm install
npm run dev        # http://localhost:4321
```

## Build

```sh
npm run build      # → dist/
npm run preview
```

## Deploy

Static output — anything that serves a folder works. On Cloudflare Pages set
the build command to `npm run build` and the output directory to `dist`;
`_headers` and `_redirects` are picked up automatically.

## Placeholder content

These need real values before launch:

- **Committee names** in `src/content/team/committee.json` are `Name Surname`
  placeholders — the roles are real, the people are not.
- **Sponsor names** in `src/data/site.ts` are `Partner Name` placeholders.
- **Headline stats** (members, events per year, partner count) in
  `src/data/site.ts` are estimates.
- **Event details** in `src/content/events/` are representative of past FSA
  events but the dates, times and venues are invented.
