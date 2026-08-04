// Fetches live ETH/USD price from CoinGecko public API (no API key required).
// Falls back to a conservative estimate if the request fails.
const FALLBACK_PRICE = 3000;
let cachedPrice: number | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getEthPrice(): Promise<number> {
  const now = Date.now();
  if (cachedPrice !== null && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedPrice;
  }

  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
    );
    if (!res.ok) throw new Error("Non-OK response");
    const data = await res.json();
    const price = data?.ethereum?.usd;
    if (typeof price === "number" && price > 0) {
      cachedPrice = price;
      cacheTimestamp = now;
      return price;
    }
    throw new Error("Unexpected response shape");
  } catch {
    return cachedPrice ?? FALLBACK_PRICE;
  }
}
