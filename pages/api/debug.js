// pages/api/debug.js — Test xem data source nào đang hoạt động
// Truy cập: /api/debug?ticker=VCB

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const ticker = (req.query.ticker || "VCB").toUpperCase();
  const results = {};

  const TCBS_HEADERS = {
    "Accept": "application/json",
    "User-Agent": "Mozilla/5.0 Chrome/120.0.0.0",
    "Origin": "https://tcinvest.tcbs.com.vn",
    "Referer": "https://tcinvest.tcbs.com.vn/",
  };

  // Test 1: TCBS Quote
  try {
    const r = await fetch(
      `https://apipubaws.tcbs.com.vn/stock-insight/v1/stock/quote?tickers=${ticker}`,
      { headers: TCBS_HEADERS, signal: AbortSignal.timeout(8000) }
    );
    const status = r.status;
    const body = await r.json().catch(() => null);
    results.tcbs_quote = {
      status,
      ok: r.ok,
      hasData: !!body?.data?.[0],
      rawKeys: body ? Object.keys(body) : [],
      sample: body?.data?.[0] ? Object.keys(body.data[0]) : body?.listStock?.[0] ? Object.keys(body.listStock[0]) : null,
    };
  } catch (e) {
    results.tcbs_quote = { error: e.message };
  }

  // Test 2: TCBS History
  try {
    const to = Math.floor(Date.now() / 1000);
    const from = to - 30 * 86400;
    const r = await fetch(
      `https://apipubaws.tcbs.com.vn/stock-insight/v1/stock/bars-long-term?ticker=${ticker}&type=stock&resolution=D&from=${from}&to=${to}`,
      { headers: TCBS_HEADERS, signal: AbortSignal.timeout(8000) }
    );
    const body = await r.json().catch(() => null);
    results.tcbs_history = {
      status: r.status,
      ok: r.ok,
      count: body?.data?.length ?? 0,
      sampleKeys: body?.data?.[0] ? Object.keys(body.data[0]) : null,
    };
  } catch (e) {
    results.tcbs_history = { error: e.message };
  }

  // Test 3: TCBS Ratios
  try {
    const r = await fetch(
      `https://apipubaws.tcbs.com.vn/stock-insight/v1/finance/ratio?ticker=${ticker}&type=quarterly&count=2`,
      { headers: TCBS_HEADERS, signal: AbortSignal.timeout(8000) }
    );
    const body = await r.json().catch(() => null);
    results.tcbs_ratios = {
      status: r.status,
      ok: r.ok,
      hasData: !!body?.data?.[0],
      sampleKeys: body?.data?.[0] ? Object.keys(body.data[0]) : null,
    };
  } catch (e) {
    results.tcbs_ratios = { error: e.message };
  }

  // Test 4: SSI
  try {
    const to = Math.floor(Date.now() / 1000);
    const from = to - 10 * 86400;
    const r = await fetch(
      `https://fc-data.ssi.com.vn/api/v2/Market/IntradayData?symbol=${ticker}&resolution=D&fromTime=${from}&toTime=${to}&size=5`,
      { signal: AbortSignal.timeout(8000) }
    );
    const body = await r.json().catch(() => null);
    results.ssi = {
      status: r.status,
      ok: r.ok,
      rawKeys: body ? Object.keys(body) : [],
    };
  } catch (e) {
    results.ssi = { error: e.message };
  }

  return res.status(200).json({
    ticker,
    timestamp: new Date().toISOString(),
    results,
    recommendation: Object.values(results).some(r => r.ok) ? "✅ Ít nhất 1 source đang hoạt động" : "❌ Tất cả source đều lỗi — có thể bị block IP"
  });
}
