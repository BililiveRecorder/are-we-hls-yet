import { defineConfig, sharpImageService } from 'astro/config';
import sharp from 'sharp';

import solidJs from "@astrojs/solid-js";
import mdx from "@astrojs/mdx";
import tailwind from "@astrojs/tailwind";
import compress from "astro-compress";

// https://astro.build/config
export default defineConfig({
  image: sharpImageService(),
  integrations: [solidJs(), mdx(), tailwind(), compress()]
});