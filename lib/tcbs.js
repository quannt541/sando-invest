// lib/tcbs.js — Multi-source stock data (TCBS + SSI fallback)

const TCBS_BASE = "https://apipubaws.tcbs.com.vn";
const SSI_BASE  = "https://fc-data.ssi.com.vn/api/v2";

// Headers để TCBS không block
const TCBS_HEADERS = {
  "Accept": "application/json",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Origin": "https://tcinvest.tcbs.com.vn",
  "Referer": "https://tcinvest.tcbs.com.vn/",
};

// ─── QUOTE ───────────────────────────────────────────────────────────────────

async function getQuoteTCBS(t) {
  const res = await fetch(
    `${TCBS_BASE}/stock-insight/v1/stock/quote?tickers=${t}`,
    { headers: TCBS_HEADERS, cache: "no-store" }
  );
  if (!res.ok) throw new Error(`TCBS quote ${res.status}`);
  const data = await res.json();

  // TCBS có thể trả về data hoặc listStock
  const list = data?.data ?? data?.listStock ?? [];
  const item = Array.isArray(list) ? list[0] : null;
  if (!item) throw new Error("Ticker not found in TCBS");

  // lastPrice có thể đã chia 1000 hoặc chưa — kiểm tra magnitude
  const raw = item.lastPrice ?? item.close ?? 0;
  const price = raw > 10000 ? raw / 1000 : raw; // TCBS đôi khi trả đơn vị đồng

  return {
    ticker: t,
    price,
    change:    item.priceChange ?? 0,
    changePct: (item.priceChangeRatio ?? item.changePct ?? 0) * 100,
    volume:    item.totalTradingValue ?? item.matchingVolume ?? 0,
    avgVolume: item.averageTradingValue10days ?? 0,
  };
}

async function getQuoteSSI(t) {
  // SSI public endpoint — không cần auth
  const res = await fetch(
    `${SSI_BASE}/Market/IntradayData?symbol=${t}&resolution=D&fromTime=&toTime=&size=1`,
    { headers: { "Accept": "application/json" }, cache: "no-store" }
  );
  if (!res.ok) throw new Error(`SSI quote ${res.status}`);
  const data = await res.json();
  const bars = data?.data?.BarData ?? data?.BarData ?? [];
  if (!bars.length) throw new Error("SSI no data");
  const b = bars[bars.length - 1];
  const price = b.Close > 10000 ? b.Close / 1000 : b.Close;
  return {
    ticker: t,
    price,
    change:    0,
    changePct: 0,
    volume:    b.Volume ?? 0,
    avgVolume: 0,
  };
}

export async function getQuote(ticker) {
  const t = ticker.toUpperCase();
  try {
    return await getQuoteTCBS(t);
  } catch (e1) {
    console.warn(`TCBS quote failed (${e1.message}), trying SSI...`);
    try {
      return await getQuoteSSI(t);
    } catch (e2) {
      throw new Error(`Không tìm thấy mã ${t} (TCBS: ${e1.message} | SSI: ${e2.message})`);
    }
  }
}

// ─── HISTORY ─────────────────────────────────────────────────────────────────

async function getHistoryTCBS(t, days) {
  const toDate   = Math.floor(Date.now() / 1000);
  const fromDate = toDate - days * 86400;
  const res = await fetch(
    `${TCBS_BASE}/stock-insight/v1/stock/bars-long-term?ticker=${t}&type=stock&resolution=D&from=${fromDate}&to=${toDate}`,
    { headers: TCBS_HEADERS, cache: "no-store" }
  );
  if (!res.ok) throw new Error(`TCBS history ${res.status}`);
  const data = await res.json();
  const bars = data?.data ?? [];
  if (!bars.length) throw new Error("TCBS no history");

  return bars.map((d) => {
    const close = d.close > 10000 ? d.close / 1000 : d.close;
    const high  = d.high  > 10000 ? d.high  / 1000 : d.high;
    const low   = d.low   > 10000 ? d.low   / 1000 : d.low;
    const open  = d.open  > 10000 ? d.open  / 1000 : d.open;
    return {
      date:   new Date(d.tradingDate).toISOString().slice(0, 10),
      open, high, low, close,
      volume: d.volume ?? 0,
    };
  }).filter(d => d.close > 0);
}

async function getHistorySSI(t, days) {
  const toDate   = Math.floor(Date.now() / 1000);
  const fromDate = toDate - days * 86400;
  const res = await fetch(
    `${SSI_BASE}/Market/IntradayData?symbol=${t}&resolution=D&fromTime=${fromDate}&toTime=${toDate}&size=${days}`,
    { headers: { "Accept": "application/json" }, cache: "no-store" }
  );
  if (!res.ok) throw new Error(`SSI history ${res.status}`);
  const data = await res.json();
  const bars = data?.data?.BarData ?? data?.BarData ?? [];
  if (!bars.length) throw new Error("SSI no history");

  return bars.map((b) => {
    const close = b.Close > 10000 ? b.Close / 1000 : b.Close;
    return {
      date:   new Date(b.Time * 1000).toISOString().slice(0, 10),
      open:   b.Open  > 10000 ? b.Open  / 1000 : b.Open,
      high:   b.High  > 10000 ? b.High  / 1000 : b.High,
      low:    b.Low   > 10000 ? b.Low   / 1000 : b.Low,
      close,
      volume: b.Volume ?? 0,
    };
  }).filter(d => d.close > 0);
}

export async function getHistory(ticker, days = 800) {
  const t = ticker.toUpperCase();
  try {
    return await getHistoryTCBS(t, days);
  } catch (e1) {
    console.warn(`TCBS history failed (${e1.message}), trying SSI...`);
    try {
      return await getHistorySSI(t, days);
    } catch (e2) {
      throw new Error(`History unavailable (TCBS: ${e1.message} | SSI: ${e2.message})`);
    }
  }
}

// ─── RATIOS ──────────────────────────────────────────────────────────────────

export async function getRatios(ticker) {
  const t = ticker.toUpperCase();
  try {
    const res = await fetch(
      `${TCBS_BASE}/stock-insight/v1/finance/ratio?ticker=${t}&type=quarterly&count=4`,
      { headers: TCBS_HEADERS, cache: "no-store" }
    );
    if (!res.ok) throw new Error(`Ratios ${res.status}`);
    const data = await res.json();
    const list   = data?.data ?? data?.listFinancialRatio ?? [];
    const latest = Array.isArray(list) ? list[0] : null;
    if (!latest) return null;
    return {
      pe:             latest.pe             ?? latest.priceToEarning ?? null,
      pb:             latest.pb             ?? latest.priceToBook    ?? null,
      roe:            latest.roe            ?? null,
      eps:            latest.eps            ?? latest.earningPerShare ?? null,
      revenue_growth: latest.revenueGrowth  ?? null,
      profit_growth:  latest.profitGrowth   ?? null,
    };
  } catch (e) {
    console.warn(`getRatios failed: ${e.message}`);
    return null;
  }
}

// Compute Sando signals from history
export function computeSandoSignals(history, currentPrice) {
  if (!history?.length) return null;

  // 3-year high (last 756 trading days ≈ 3 years)
  const last3y = history.slice(-756);
  const high3y = Math.max(...last3y.map((d) => d.high));

  // % drop from 3-year high
  const dropFromHigh = ((high3y - currentPrice) / high3y) * 100;

  // Average volume last 20 days vs last 5 days
  const vol20 = history.slice(-20).reduce((s, d) => s + d.volume, 0) / 20;
  const vol5 = history.slice(-5).reduce((s, d) => s + d.volume, 0) / 5;
  const volRatio = vol5 / vol20;

  // Price trend: compare last close vs 20d MA
  const ma20 = history.slice(-20).reduce((s, d) => s + d.close, 0) / 20;
  const ma60 = history.slice(-60).reduce((s, d) => s + d.close, 0) / 60;
  const aboveMa20 = currentPrice > ma20;
  const aboveMa60 = currentPrice > ma60;

  // Buy zones
  const zone1 = high3y * 0.80; // -20%
  const zone2 = high3y * 0.70; // -30%
  const zone3 = high3y * 0.60; // -40%

  // Determine active buy zone
  let buyZone = null;
  let buyPercent = 0;
  if (currentPrice <= zone3) { buyZone = 3; buyPercent = 30; }
  else if (currentPrice <= zone2) { buyZone = 2; buyPercent = 40; }
  else if (currentPrice <= zone1) { buyZone = 1; buyPercent = 30; }

  // Sell targets from current avg (approximate)
  const sellTarget1 = currentPrice * 1.20;
  const sellTarget2 = currentPrice * 1.30;
  const sellTarget3 = currentPrice * 1.50;

  // Momentum: high volume + uptrend = positive
  const momentum = volRatio >= 1.5 && aboveMa20 ? "strong" : volRatio >= 1.0 ? "neutral" : "weak";

  // Overall signal
  let signal = "WAIT";
  if (buyZone && momentum !== "weak") signal = "BUY";
  else if (buyZone) signal = "WATCH";
  else if (dropFromHigh < 5 && momentum === "strong") signal = "HOLD";

  return {
    high3y,
    dropFromHigh,
    zone1, zone2, zone3,
    buyZone,
    buyPercent,
    sellTarget1, sellTarget2, sellTarget3,
    ma20, ma60,
    aboveMa20, aboveMa60,
    volRatio,
    momentum,
    signal,
  };
}

// Top VN stocks Sando-approved
export const SANDO_WATCHLIST = [
  { ticker: "VCB",  name: "Vietcombank",   sector: "Ngân hàng",   grade: "A" },
  { ticker: "BID",  name: "BIDV",          sector: "Ngân hàng",   grade: "A" },
  { ticker: "CTG",  name: "VietinBank",    sector: "Ngân hàng",   grade: "A" },
  { ticker: "MBB",  name: "MB Bank",       sector: "Ngân hàng",   grade: "A" },
  { ticker: "FPT",  name: "FPT Corp",      sector: "Công nghệ",   grade: "A" },
  { ticker: "SSI",  name: "SSI",           sector: "Chứng khoán", grade: "B" },
  { ticker: "HPG",  name: "Hòa Phát",      sector: "Sắt thép",    grade: "B" },
  { ticker: "VNM",  name: "Vinamilk",      sector: "Tiêu dùng",   grade: "B" },
];
