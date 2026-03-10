// pages/api/stock.js
import { getQuote, getHistory, getRatios, computeSandoSignals } from "../../lib/tcbs";

export default async function handler(req, res) {
  // Allow CORS từ mọi origin
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  const { ticker } = req.query;
  if (!ticker) return res.status(400).json({ error: "Missing ticker" });

  const sym = ticker.toUpperCase().trim();

  try {
    // Lấy quote trước — nếu fail thì báo lỗi rõ
    let quote;
    try {
      quote = await getQuote(sym);
    } catch (e) {
      console.error(`[stock] getQuote(${sym}) failed:`, e.message);
      return res.status(404).json({
        error: `Không lấy được dữ liệu mã ${sym}. Vui lòng thử lại sau.`,
        detail: e.message,
      });
    }

    // History và ratios — không critical, fallback về null nếu lỗi
    const [historyResult, ratiosResult] = await Promise.allSettled([
      getHistory(sym, 800),
      getRatios(sym),
    ]);

    if (historyResult.status === "rejected") {
      console.warn(`[stock] getHistory(${sym}) failed:`, historyResult.reason?.message);
    }
    if (ratiosResult.status === "rejected") {
      console.warn(`[stock] getRatios(${sym}) failed:`, ratiosResult.reason?.message);
    }

    const h = historyResult.status === "fulfilled" ? historyResult.value : [];
    const r = ratiosResult.status  === "fulfilled" ? ratiosResult.value  : null;
    const signals = h.length >= 20 ? computeSandoSignals(h, quote.price) : null;

    return res.status(200).json({
      ticker: sym,
      quote,
      signals,
      ratios: r,
      historyLength: h.length,
      priceHistory: h.slice(-120).map((d) => ({
        date:   d.date,
        close:  d.close,
        volume: d.volume,
      })),
    });
  } catch (err) {
    console.error(`[stock] Unexpected error for ${sym}:`, err);
    return res.status(500).json({ error: err.message });
  }
}
