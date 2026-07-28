import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

export const collections = {
  // Writing/notes — Markdown files in src/content/writing/. Uses the modern
  // Content Layer loader. Posts with `draft: true` are excluded from the index,
  // the nav link, and the RSS feed, so the section stays invisible until a real
  // post ships.
  writing: defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./src/content/writing" }),
    schema: z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.coerce.date(),
      draft: z.boolean().default(false),
      tags: z.array(z.string()).default([]),
    }),
  }),
  about: defineCollection({
    schema: z.object({
      title: z.string(),
      photo: z.string(),
      link: z.string().url(),
      body: z.string().optional(),
    }),
  }),
  contact: defineCollection({
    schema: z.object({
      icon: z.string(),
      linkUrl: z.string(),
      linkText: z.string(),
      footerIcon: z.string(),
      footerText: z.string(),
      footerLinkText: z.string(),
      footerLinkUrl: z.string().url(),
      body: z.string().optional(),
    }),
  }),
  education: defineCollection({
    schema: z.object({
      degree: z.string(),
      school: z.string(),
      startDate: z.string(),
      endDate: z.string(),
      logo: z.string(),
      link: z.string().url(),
      achievements: z.array(z.string()),
    }),
  }),
  projects: defineCollection({
    schema: z.object({
      title: z.string(),
      subtitle: z.string(),
      link: z.string().url(),
      skills: z.array(z.string()),
    }),
  }),
  work: defineCollection({
    schema: z.object({
      title: z.string(),
      subtitle: z.string(),
      location: z.string(),
      startDate: z.string(),
      endDate: z.string(),
      logo: z.string(),
      link: z.string().url(),
      skills: z.array(z.string()),
    }),
  }),
};
