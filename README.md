# matt marinic — personal site

Personal site built with [Astro](https://astro.build). Warm minimal aesthetic, dark by default, terracotta accents, Fraunces serif headlines.

## Project structure

```
src/
  layouts/Base.astro       # html shell + nav
  components/
    Nav.astro              # top navigation
    Footer.astro           # shared footer
  pages/
    index.astro            # home (cover hero)
    2026.astro             # this year's log
    about.astro
    blog.astro             # blog index — auto-built from posts/
    contact.astro
    posts/[...slug].astro  # renders an individual post
  content/
    posts/                 # markdown blog posts go here
  content.config.ts        # post frontmatter schema
public/
  styles.css               # all styles
  script.js                # theme toggle
```

## Writing a new blog post

1. Create a markdown file in `src/content/posts/`, e.g. `src/content/posts/my-post.md`:

   ```markdown
   ---
   title: my post title
   date: 2026-05-08
   tag: writing
   description: optional one-line description
   ---

   write your post here in plain markdown.

   ## subheadings work

   - lists work
   - **bold** and *italic* work
   - [links](https://example.com) work too
   ```

2. Push to GitHub. The blog index updates automatically and Cloudflare redeploys.

The filename becomes the URL slug: `my-post.md` → `/posts/my-post`.

## Run locally

```sh
npm install
npm run dev
```

Open <http://localhost:4321>.

## Build

```sh
npm run build         # outputs to dist/
npm run preview       # preview the built site
```

## Deploy

Cloudflare auto-builds on every push to the deployed branch (config in `wrangler.jsonc`). Build command is `npm run build`, output is `./dist`.

## Customizing

- **Edit a page** — open the corresponding `.astro` file in `src/pages/`.
- **Edit nav/footer** — `src/components/Nav.astro` and `Footer.astro`.
- **Theme & palette** — `public/styles.css` (top of file under `:root`).
- **Swap a banner gradient for a real photo** — replace `<div class="banner banner-terracotta"></div>` with `<div class="banner"><img src="/images/yourphoto.jpg" alt="" /></div>` and drop the file in `public/images/`.
