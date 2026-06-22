# trip-roulette

Surprise-destination travel app. Pick your origin, dates, budget, and vibe — get a destination you didn't ask for, a real Duffel flight price, and a day-by-day itinerary.

## Stack

- Next.js 16 (App Router) + React 19
- TypeScript
- Tailwind CSS v4
- Framer Motion (for the reveal moment)
- Duffel API (flights — sandbox until launch)

## Build order

1. **Prove Duffel works** — `npm run test:duffel`. No UI, just confirms the offer-request flow returns real data.
2. **Destination strategy** — start with a hand-curated `destinations.json` of ~40 cities tagged by vibe.
3. **End-to-end ugly** — input form → loading → reveal → itinerary, in plain HTML.
4. **Design the reveal first** — it's the heart of the product.
5. **Then everything else** — input form, itinerary view, share card.

## Getting started

```bash
cp .env.example .env
# add your Duffel sandbox key (starts with duffel_test_)

npm run test:duffel   # step 1: prove the API works
npm run dev           # step 2+: start building the UI
```

## Aesthetic direction

Undecided. Candidate directions: editorial / boarding-pass / soft & dreamy / brutalist. Decide before designing the reveal screen.
