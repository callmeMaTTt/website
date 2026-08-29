/**
 * Single source of truth for site-wide content.
 * Editing this file is enough to update the nav, footer, contact details,
 * headline stats and the sponsor wall — no component changes needed.
 */

export const site = {
  name: "Finance Students' Association",
  short: 'FSA',
  university: 'University of Melbourne',
  founded: 2015,
  url: 'https://www.fsaunimelb.com',
  tagline:
    "The bridge between finance study and the profession, at the University of Melbourne.",
};

export const nav = [
  { href: '/about', label: 'About' },
  { href: '/events', label: 'Events' },
  { href: '/people', label: 'Our People' },
  { href: '/sponsors', label: 'Partners' },
  { href: '/contact', label: 'Contact' },
];

export const contact = {
  general: 'contact@fsaunimelb.com',
  sponsorship: 'sponsorship@fsaunimelb.com',
};

export const socials = [
  { label: 'Instagram', href: 'https://www.instagram.com/fsaunimelb', icon: 'instagram' },
  { label: 'LinkedIn', href: "https://au.linkedin.com/company/finance-students'-association", icon: 'linkedin' },
  { label: 'Facebook', href: 'https://www.facebook.com/fsaunimelb/', icon: 'facebook' },
  { label: 'TikTok', href: 'https://www.tiktok.com/@fsaunimelb', icon: 'tiktok' },
] as const;

/** Headline numbers on the home page. Update once a year. */
export const stats = [
  { value: '2015', label: 'Founded' },
  { value: '1,200+', label: 'Members' },
  { value: '25+', label: 'Events a year' },
  { value: '15+', label: 'Industry partners' },
];

/** What the club actually does — the three pillars. */
export const pillars = [
  {
    n: '01',
    title: 'Career',
    body: 'Insight evenings, firm tours and networking nights with the banks, funds and advisory firms that hire from Parkville — plus the application and interview prep to get you there.',
  },
  {
    n: '02',
    title: 'Academic',
    body: 'Revision workshops, study groups and peer mentoring across the core finance subjects, run by students who have already sat them.',
  },
  {
    n: '03',
    title: 'Community',
    body: 'A cohort you actually know. Socials, our annual ball, and a committee you can join to build something alongside people headed the same way.',
  },
];

/**
 * Sponsors. Drop a logo in `public/images/sponsors/` and add `logo: '/images/sponsors/x.svg'`
 * to render it instead of the wordmark fallback.
 */
export const sponsorTiers = [
  {
    tier: 'Principal Partners',
    items: [
      { name: 'Partner Name', href: '#' },
      { name: 'Partner Name', href: '#' },
    ],
  },
  {
    tier: 'Major Partners',
    items: [
      { name: 'Partner Name', href: '#' },
      { name: 'Partner Name', href: '#' },
      { name: 'Partner Name', href: '#' },
    ],
  },
  {
    tier: 'Supporting Partners',
    items: [
      { name: 'Partner Name', href: '#' },
      { name: 'Partner Name', href: '#' },
      { name: 'Partner Name', href: '#' },
      { name: 'Partner Name', href: '#' },
    ],
  },
] satisfies {
  tier: string;
  items: { name: string; href?: string; logo?: string }[];
}[];
