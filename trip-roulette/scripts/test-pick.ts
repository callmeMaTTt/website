/**
 * End-to-end test for the surprise destination picker.
 *
 * Run with:  npm run test:pick
 *
 * Requires DUFFEL_API_KEY and ANTHROPIC_API_KEY in .env.
 */

import { pickDestination } from "../lib/pick";

async function main() {
  const result = await pickDestination({
    origin: "LHR",
    date: "2026-08-15",
    budget: 800,
    vibes: ["food", "walkable", "weird"],
    intent: "I want somewhere I can wander on foot, eat well, and feel a bit out of my element",
  });

  if (!result) {
    console.log("No destinations matched. Try widening vibes or raising budget.");
    return;
  }

  console.log("\n— Pick —");
  console.log(`${result.pick.destination.city} (${result.pick.destination.iata})`);
  console.log(`${result.pick.offer.total_currency} ${result.pick.price}  via ${result.pick.offer.owner.name}`);
  console.log(`Why: ${result.reason}`);

  console.log("\n— Runners up —");
  result.runnersUp.forEach((c, i) => {
    console.log(`${i + 1}. ${c.destination.city} (${c.destination.iata}) — ${c.offer.total_currency} ${c.price}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
