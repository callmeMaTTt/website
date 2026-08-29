import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

/**
 * Events. Add a markdown file in `src/content/events/` and it appears on
 * /events automatically — sorted by date, split into upcoming vs. past.
 */
const events = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/events' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    time: z.string().optional(),
    location: z.string().optional(),
    summary: z.string(),
    tags: z.array(z.string()).default([]),
    registerUrl: z.string().url().optional(),
    /** Set false to hide without deleting the file. */
    published: z.boolean().default(true),
  }),
});

/** Committee, from a single JSON file so a handover is one edit. */
const team = defineCollection({
  loader: file('./src/content/team/committee.json'),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    role: z.string(),
    group: z.enum(['executive', 'directors']),
    photo: z.string().optional(),
    linkedin: z.string().url().optional(),
  }),
});

export const collections = { events, team };
