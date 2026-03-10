// pages/api/debug.js — Test Yahoo Finance: /api/debug?ticker=VCB
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const ticker = (req.query.ticker || "VCB").toUpperCase();
  const sym    = `${ticker}.VN`;
  const results = {};

  try {
    const YF = (await import("yahoo-finance2")).default;
    const yf = new YF();
    try { yf.suppressNotices(["yahooSurvey"]); } catch {}

    // Test quote
    try {
      const q = await yf.quote(sym);
      results.quote = { ok: true, price: q?.regularMarketPrice, name: q?.longName };
    } catch (e) {
      results.quote = { ok: false, error: e.message };
    }

    // Test history (7 ngày)
    try {
      const to   = new Date();
      const from = new Date(); from.setDate(from.getDate() - 7);
      const h    = await yf.historical(sym, {
        period1: from.toISOString().slice(0,10),
        period2: to.toISOString().slice(0,10),
        interval: "1d",
      });
      results.history = { ok: true, count: h?.length, latest: h?.slice(-1)?.[0] };
    } catch (e) {
      results.history = { ok: false, error: e.message };
    }

  } catch (e) {
    results.import_error = e.message;
  }

  const allOk = results.quote?.ok && results.history?.ok;
  return res.status(200).json({
    symbol: sym,
    timestamp: new Date().toISOString(),
    results,
    status: allOk ? "✅ Yahoo Finance hoạt động" : "❌ Có lỗi",
  });
}
