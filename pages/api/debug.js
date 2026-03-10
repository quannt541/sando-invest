// pages/api/debug.js — Test Yahoo Finance connectivity
// URL: /api/debug?ticker=VCB

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const ticker = (req.query.ticker || "VCB").toUpperCase();
  const sym = `${ticker}.VN`;
  const results = {};

  // Test Yahoo Finance quote
  try {
    const yf = await import("yahoo-finance2");
    const q = await yf.default.quote(sym);
    results.yahoo_quote = {
      ok: true,
      symbol: sym,
      price: q?.regularMarketPrice,
      name: q?.longName ?? q?.shortName,
    };
  } catch (e) {
    results.yahoo_quote = { ok: false, error: e.message };
  }

  // Test Yahoo Finance history (7 ngày gần nhất)
  try {
    const yf = await import("yahoo-finance2");
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 7);
    const h = await yf.default.historical(sym, {
      period1: fromDate.toISOString().slice(0, 10),
      period2: toDate.toISOString().slice(0, 10),
      interval: "1d",
    });
    results.yahoo_history = {
      ok: true,
      count: h?.length,
      latest: h?.slice(-1)?.[0],
    };
  } catch (e) {
    results.yahoo_history = { ok: false, error: e.message };
  }

  const allOk = Object.values(results).every(r => r.ok);
  return res.status(200).json({
    ticker: sym,
    timestamp: new Date().toISOString(),
    results,
    status: allOk ? "✅ Yahoo Finance đang hoạt động" : "❌ Có lỗi — xem chi tiết trong results",
  });
}
