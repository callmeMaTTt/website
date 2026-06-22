import Anthropic from "@anthropic-ai/sdk";
import { cheapestOffer, type Offer } from "@/lib/duffel";
import { type Destination, filterByVibes, ALL_DESTINATIONS } from "@/lib/destinations";

export type Candidate = {
  destination: Destination;
  offer: Offer;
  price: number;
};

export type PickRequest = {
  origin: string;
  date: string;
  budget: number;
  vibes: string[];
  intent: string;
  exclude?: string[];
};

export type PickResult = {
  pick: Candidate;
  reason: string;
  runnersUp: Candidate[];
};

async function fanOut(origin: string, date: string, dests: Destination[]): Promise<Candidate[]> {
  const results = await Promise.all(
    dests.map(async (d) => {
      const offer = await cheapestOffer(origin, d.iata, date);
      if (!offer) return null;
      return {
        destination: d,
        offer,
        price: parseFloat(offer.total_amount),
      } satisfies Candidate;
    }),
  );
  return results.filter((c): c is Candidate => c !== null);
}

async function scoreWithClaude(
  intent: string,
  budget: number,
  candidates: Candidate[],
): Promise<{ ranked: { iata: string; score: number; reason: string }[] }> {
  const client = new Anthropic();

  const list = candidates
    .map((c) => `- ${c.destination.iata} (${c.destination.city}, ${c.destination.country}): ${c.offer.total_currency} ${c.price}, vibes: ${c.destination.vibes.join(", ")}`)
    .join("\n");

  const response = await client.messages.parse({
    model: "claude-haiku-4-5",
    max_tokens: 2048,
    system:
      "You are a travel curator. Given a user's free-text intent and budget, score destinations 0-100 for fit. Higher is better. Consider vibe match, price-to-budget ratio (cheaper is better but only mildly), and how surprising/interesting the choice feels. Be opinionated.",
    messages: [
      {
        role: "user",
        content: `User intent: "${intent}"\nBudget: ${budget}\n\nDestinations (with real flight prices):\n${list}\n\nScore each and explain in one sentence why.`,
      },
    ],
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            ranked: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  iata: { type: "string" },
                  score: { type: "number" },
                  reason: { type: "string" },
                },
                required: ["iata", "score", "reason"],
              },
            },
          },
          required: ["ranked"],
        },
      },
    },
  });

  return response.parsed_output as { ranked: { iata: string; score: number; reason: string }[] };
}

function weightedPick<T>(items: { item: T; weight: number }[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const { item, weight } of items) {
    r -= weight;
    if (r <= 0) return item;
  }
  return items[0].item;
}

export async function pickDestination(req: PickRequest): Promise<PickResult | null> {
  const excluded = new Set(req.exclude ?? []);
  const pool = filterByVibes(req.vibes).filter((d) => !excluded.has(d.iata) && d.iata !== req.origin);

  const candidatePool = pool.length > 0 ? pool : ALL_DESTINATIONS.filter((d) => !excluded.has(d.iata) && d.iata !== req.origin);
  const shortlist = candidatePool.sort(() => Math.random() - 0.5).slice(0, 15);

  const candidates = await fanOut(req.origin, req.date, shortlist);
  const affordable = candidates.filter((c) => c.price <= req.budget);
  if (affordable.length === 0) return null;

  const top = affordable.sort((a, b) => a.price - b.price).slice(0, 8);

  const { ranked } = await scoreWithClaude(req.intent, req.budget, top);
  const scoreByIata = new Map(ranked.map((r) => [r.iata, r]));

  const weighted = top
    .map((c) => {
      const s = scoreByIata.get(c.destination.iata);
      return { item: c, weight: Math.pow((s?.score ?? 50) / 100, 3), reason: s?.reason ?? "" };
    })
    .filter((w) => w.weight > 0);

  if (weighted.length === 0) return null;

  const pick = weightedPick(weighted);
  const reason = scoreByIata.get(pick.destination.iata)?.reason ?? "";
  const runnersUp = top.filter((c) => c !== pick).slice(0, 3);

  return { pick, reason, runnersUp };
}
