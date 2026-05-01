import { defineCollection, z } from "astro:content";

const nav = defineCollection({
  type: "data",
  schema: z.record(z.any()),
});

const home = defineCollection({
  type: "data",
  schema: z.record(z.any()),
});

const pages = defineCollection({
  type: "data",
  schema: z.record(z.any()),
});

const site = defineCollection({
  type: "data",
  schema: z.record(z.any()),
});

export const collections = {
  nav,
  home,
  pages,
  site,
};
