import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://mattmarinic.com',
  trailingSlash: 'never',
  build: {
    format: 'file',
  },
});
