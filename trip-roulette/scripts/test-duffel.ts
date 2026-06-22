/**
 * Step 1: prove Duffel works end-to-end before writing any UI.
 *
 * Run with:  npx tsx scripts/test-duffel.ts
 *
 * What it does:
 *   1. Single offer request: MEL -> NRT, fixed date, 1 adult, economy.
 *      Prints the cheapest offer.
 *   2. Fan-out: same origin/date across a handful of candidate destinations
 *      in parallel. Sorts by price, prints the top 3.
 *
 * This is the "destination roulette" core, minus the LLM scoring layer.
 */

const DUFFEL_API = "https://api.duffel.com";
const DUFFEL_VERSION = "v2";

type OfferRequestBody = {
  data: {
    slices: { origin: string; destination: string; departure_date: string }[];
    passengers: { type: "adult" }[];
    cabin_class: "economy" | "premium_economy" | "business" | "first";
  };
};

type Offer = {
  id: string;
  total_amount: string;
  total_currency: string;
  owner: { name: string; iata_code: string };
  slices: {
    origin: { iata_code: string };
    destination: { iata_code: string; city_name?: string };
    duration: string;
    segments: { departing_at: string; arriving_at: string }[];
  }[];
};

async function duffel<T>(path: string, body: unknown): Promise<T> {
  const key = process.env.DUFFEL_API_KEY;
  if (!key) throw new Error("DUFFEL_API_KEY missing — copy .env.example to .env and add a sandbox key");

  const res = await fetch(`${DUFFEL_API}${path}?return_offers=true`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Duffel-Version": DUFFEL_VERSION,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Duffel ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

async function cheapestOffer(origin: string, destination: string, date: string): Promise<Offer | null> {
  const body: OfferRequestBody = {
    data: {
      slices: [{ origin, destination, departure_date: date }],
      passengers: [{ type: "adult" }],
      cabin_class: "economy",
    },
  };
  const result = await duffel<{ data: { offers: Offer[] } }>("/air/offer_requests", body);
  const offers = result.data.offers ?? [];
  if (offers.length === 0) return null;
  return offers.sort((a, b) => parseFloat(a.total_amount) - parseFloat(b.total_amount))[0];
}

function formatOffer(o: Offer) {
  const slice = o.slices[0];
  return `${slice.origin.iata_code} → ${slice.destination.iata_code}  ${o.total_currency} ${o.total_amount}  (${o.owner.name})`;
}

async function main() {
  const origin = "LHR";
  const date = "2026-08-15";

  console.log(`\n— Single search: ${origin} → NRT on ${date} —`);
  const single = await cheapestOffer(origin, "NRT", date);
  console.log(single ? formatOffer(single) : "no offers");

  console.log(`\n— Fan-out: ${origin} → 5 candidates on ${date} —`);
  const candidates = ["NRT", "SIN", "CDG", "JFK", "DXB"];
  const results = await Promise.all(
    candidates.map(async (dst) => ({ dst, offer: await cheapestOffer(origin, dst, date) })),
  );

  const ranked = results
    .filter((r): r is { dst: string; offer: Offer } => r.offer !== null)
    .sort((a, b) => parseFloat(a.offer.total_amount) - parseFloat(b.offer.total_amount));

  ranked.slice(0, 3).forEach((r, i) => console.log(`${i + 1}. ${formatOffer(r.offer)}`));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
