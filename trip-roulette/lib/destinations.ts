import destinations from "@/data/destinations.json";

export type Destination = {
  iata: string;
  city: string;
  country: string;
  vibes: string[];
};

export const ALL_DESTINATIONS = destinations as Destination[];

export function filterByVibes(vibes: string[]): Destination[] {
  if (vibes.length === 0) return ALL_DESTINATIONS;
  const wanted = new Set(vibes.map((v) => v.toLowerCase()));
  return ALL_DESTINATIONS.filter((d) =>
    d.vibes.some((v) => wanted.has(v.toLowerCase())),
  );
}
