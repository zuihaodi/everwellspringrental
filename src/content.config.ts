import { defineCollection, z } from "astro:content";

const nav = defineCollection({
  type: "data",
  schema: z.record(z.any()),
});

const finance = defineCollection({
  type: "data",
  schema: z.record(z.any()),
});

const home = defineCollection({
  type: "data",
  schema: z.record(z.any()),
});

const products = defineCollection({
  type: "data",
  schema: z.record(z.any()),
});

const pages = defineCollection({
  type: "data",
  schema: z.record(z.any()),
});

const cards = defineCollection({
  type: "data",
  schema: z.record(z.any()),
});

const site = defineCollection({
  type: "data",
  schema: z.record(z.any()),
});

export const collections = {
  nav,
  finance,
  home,
  products,
  pages,
  cards,
  site,
};
