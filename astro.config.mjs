import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";
import keystatic from "@keystatic/astro";

export default defineConfig({
  output: "server",
  adapter: cloudflare({
    workerEntryPoint: {
      path: "./src/app/worker-entrypoint.ts",
    },
  }),
  integrations: [tailwind(), react(), keystatic()],
  vite: {
    cacheDir: ".vite-local",
  },
  i18n: {
    defaultLocale: "zh",
    locales: ["zh", "en"],
    routing: {
      prefixDefaultLocale: false
    }
  }
});
