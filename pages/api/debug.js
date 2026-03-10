// pages/api/debug.js — Test all 3 data sources: /api/debug?ticker=VCB
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const t = (req.query.ticker || "VCB").toUpperCase();

  async function testSource(name, url, headers = {}) {
    try {
      const r = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0", ...headers },
        signal: AbortSignal.timeout(8000),
      });
      const body = await r.text();
      return { ok: r.ok, status: r.status, preview: body.slice(0, 150) };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  const results = await Promise.all([
    testSource("VNDirect_quote",
      `https://finfo-api.vndirect.com.vn/v4/stock_prices?code=${t}&sort=-date&size=1&page=1`,
      { "Origin": "https://dchart.vndirect.com.vn", "Referer": "https://dchart.vndirect.com.vn/" }
    ),
    testSource("Stooq",
      `https://stooq.com/q/d/l/?s=${t.toLowerCase()}.vn&i=d&d1=20260301&d2=20260310`
    ),
    testSource("Yahoo_chart",
      `https://query1.finance.yahoo.com/v8/finance/chart/${t}.VN?interval=1d&range=5d`
    ),
    testSource("Yahoo_query2",
      `https://query2.finance.yahoo.com/v8/finance/chart/${t}.VN?interval=1d&range=5d`
    ),
  ]);

  const names = ["VNDirect_quote", "Stooq", "Yahoo_chart", "Yahoo_query2"];
  const out = {};
  names.forEach((n, i) => out[n] = results[i]);

  const working = names.filter((n, i) => results[i].ok);

  return res.status(200).json({
    ticker: t,
    timestamp: new Date().toISOString(),
    working_sources: working,
    status: working.length > 0 ? `✅ ${working.join(", ")} đang hoạt động` : "❌ Tất cả đều fail",
    details: out,
  });
}
