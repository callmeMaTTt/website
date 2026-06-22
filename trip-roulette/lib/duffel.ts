const DUFFEL_API = "https://api.duffel.com";
const DUFFEL_VERSION = "v2";

export type Offer = {
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

export async function cheapestOffer(
  origin: string,
  destination: string,
  date: string,
): Promise<Offer | null> {
  const key = process.env.DUFFEL_API_KEY;
  if (!key) throw new Error("DUFFEL_API_KEY missing");

  const res = await fetch(`${DUFFEL_API}/air/offer_requests?return_offers=true`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Duffel-Version": DUFFEL_VERSION,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      data: {
        slices: [{ origin, destination, departure_date: date }],
        passengers: [{ type: "adult" }],
        cabin_class: "economy",
      },
    }),
  });

  if (!res.ok) return null;

  const result = (await res.json()) as { data: { offers: Offer[] } };
  const offers = result.data.offers ?? [];
  if (offers.length === 0) return null;
  return offers.sort((a, b) => parseFloat(a.total_amount) - parseFloat(b.total_amount))[0];
}
