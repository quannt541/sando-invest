// pages/api/watchlist.js
import { getQuote, getHistory, computeSandoSignals } from "../../lib/tcbs";
import { SANDO_WATCHLIST } from "../../lib/constants";

export default async function handler(req, res) {
  try {
    const results = await Promise.allSettled(
      SANDO_WATCHLIST.map(async (item) => {
        const [quote, history] = await Promise.allSettled([
          getQuote(item.ticker),
          getHistory(item.ticker, 800),
        ]);
        if (quote.status === "rejected") return null;
        const q = quote.value;
        const h = history.status === "fulfilled" ? history.value : [];
        const signals = h.length ? computeSandoSignals(h, q.price) : null;
        return { ...item, quote: q, signals };
      })
    );

    const data = results
      .filter((r) => r.status === "fulfilled" && r.value)
      .map((r) => r.value);

    return res.status(200).json({ watchlist: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
