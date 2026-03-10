// lib/tcbs.js — TCBS public API (no key required)

const BASE = "https://apipubaws.tcbs.com.vn";

// Fetch current quote + basic info
export async function getQuote(ticker) {
  const t = ticker.toUpperCase();
  const res = await fetch(`${BASE}/stock-insight/v1/stock/quote?tickers=${t}`, {
    headers: { "Accept": "application/json" },
  });
  if (!res.ok) throw new Error(`Quote fetch failed: ${res.status}`);
  const data = await res.json();
  const item = data?.data?.[0];
  if (!item) throw new Error("Ticker not found");
  return {
    ticker: t,
    price: item.lastPrice / 1000, // convert to nghìn đồng
    change: item.priceChange,
    changePct: item.priceChangeRatio * 100,
    volume: item.totalTradingValue,
    avgVolume: item.averageTradingValue10days,
  };
}

// Fetch historical price (daily OHLCV), last N days
export async function getHistory(ticker, days = 800) {
  const t = ticker.toUpperCase();
  const toDate = Math.floor(Date.now() / 1000);
  const fromDate = toDate - days * 86400;
  const res = await fetch(
    `${BASE}/stock-insight/v1/stock/bars-long-term?ticker=${t}&type=stock&resolution=D&from=${fromDate}&to=${toDate}`,
    { headers: { "Accept": "application/json" } }
  );
  if (!res.ok) throw new Error(`History fetch failed`);
  const data = await res.json();
  if (!data?.data?.length) throw new Error("No history data");

  return data.data.map((d) => ({
    date: new Date(d.tradingDate).toISOString().slice(0, 10),
    open: d.open / 1000,
    high: d.high / 1000,
    low: d.low / 1000,
    close: d.close / 1000,
    volume: d.volume,
  }));
}

// Fetch financial ratios (PB, PE, EPS, ROE...)
export async function getRatios(ticker) {
  const t = ticker.toUpperCase();
  const res = await fetch(
    `${BASE}/stock-insight/v1/finance/ratio?ticker=${t}&type=quarterly&count=8`,
    { headers: { "Accept": "application/json" } }
  );
  if (!res.ok) throw new Error(`Ratios fetch failed`);
  const data = await res.json();
  const latest = data?.data?.[0];
  if (!latest) return null;
  return {
    pe: latest.pe ?? null,
    pb: latest.pb ?? null,
    roe: latest.roe ?? null,
    eps: latest.eps ?? null,
    revenue_growth: latest.revenueGrowth ?? null,
    profit_growth: latest.profitGrowth ?? null,
  };
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
