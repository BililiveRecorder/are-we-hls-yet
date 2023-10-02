import { defineConfig } from 'astro/config';

import solidJs from "@astrojs/solid-js";
import mdx from "@astrojs/mdx";
import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  integrations: [solidJs(), mdx(), tailwind()]
});