// pages/api/stock.js
import { getQuote, getHistory, getRatios, computeSandoSignals } from "../../lib/tcbs";

export default async function handler(req, res) {
  const { ticker } = req.query;
  if (!ticker) return res.status(400).json({ error: "Missing ticker" });

  try {
    const [quote, history, ratios] = await Promise.allSettled([
      getQuote(ticker),
      getHistory(ticker, 800),
      getRatios(ticker),
    ]);

    if (quote.status === "rejected") {
      return res.status(404).json({ error: `Không tìm thấy mã ${ticker.toUpperCase()}` });
    }

    const q = quote.value;
    const h = history.status === "fulfilled" ? history.value : [];
    const r = ratios.status === "fulfilled" ? ratios.value : null;
    const signals = h.length ? computeSandoSignals(h, q.price) : null;

    return res.status(200).json({
      ticker: ticker.toUpperCase(),
      quote: q,
      signals,
      ratios: r,
      historyLength: h.length,
      priceHistory: h.slice(-120).map((d) => ({ date: d.date, close: d.close, volume: d.volume })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
