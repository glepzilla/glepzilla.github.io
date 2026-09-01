import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://glepzilla.ru',
  integrations: [mdx(), sitemap()],
  markdown: {
    shikiConfig: {
      // Code blocks sit inside the dark terminal sheet.
      theme: 'github-dark-default'
    }
  }
});
