// lib/tcbs.js — Multi-source stock data (server-side only)
// Sources: VNDirect → Stooq → Yahoo Finance (theo thứ tự ưu tiên)

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function norm(v) {
  if (!v || isNaN(v)) return 0;
  return v > 10000 ? v / 1000 : v;   // đồng → nghìn đồng
}

function sma(arr, period) {
  if (!arr || arr.length < period) return null;
  return arr.slice(-period).reduce((s, v) => s + v, 0) / period;
}

function today() { return new Date().toISOString().slice(0, 10); }
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// ─── SOURCE 1: VNDirect ───────────────────────────────────────────────────────

async function quoteVNDirect(t) {
  const url = `https://finfo-api.vndirect.com.vn/v4/stock_prices?code=${t}&sort=-date&size=1&page=1`;
  const res = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Origin": "https://dchart.vndirect.com.vn",
      "Referer": "https://dchart.vndirect.com.vn/",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`VNDirect quote HTTP ${res.status}`);
  const data = await res.json();
  const d = data?.data?.[0];
  if (!d) throw new Error("VNDirect no data");

  return {
    ticker:    t,
    price:     norm(d.close),
    change:    norm(d.close) - norm(d.reference),
    changePct: d.reference ? ((d.close - d.reference) / d.reference) * 100 : 0,
    volume:    d.nmVolume ?? d.matchVolume ?? 0,
    avgVolume: 0,
    high:      norm(d.high),
    low:       norm(d.low),
    pe:        null,
    pb:        null,
    name:      t,
  };
}

async function historyVNDirect(t, days) {
  const url = `https://finfo-api.vndirect.com.vn/v4/stock_prices?code=${t}&sort=-date&size=${days}&page=1`;
  const res = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0",
      "Origin": "https://dchart.vndirect.com.vn",
      "Referer": "https://dchart.vndirect.com.vn/",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`VNDirect history HTTP ${res.status}`);
  const data = await res.json();
  const list = data?.data;
  if (!list?.length) throw new Error("VNDirect no history");

  return list
    .filter(d => d.close > 0)
    .reverse()
    .map(d => ({
      date:   d.date,
      open:   norm(d.open),
      high:   norm(d.high),
      low:    norm(d.low),
      close:  norm(d.close),
      volume: d.nmVolume ?? d.matchVolume ?? 0,
    }));
}

// ─── SOURCE 2: Stooq (CSV) ────────────────────────────────────────────────────

async function historyStooq(t, days) {
  const from = daysAgo(days).replace(/-/g, "");
  const to   = today().replace(/-/g, "");
  const url  = `https://stooq.com/q/d/l/?s=${t.toLowerCase()}.vn&d1=${from}&d2=${to}&i=d`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Stooq HTTP ${res.status}`);
  const csv = await res.text();
  if (csv.includes("No data") || !csv.includes(",")) throw new Error("Stooq no data");

  const lines = csv.trim().split("\n").slice(1); // skip header
  return lines
    .filter(l => l.trim())
    .map(l => {
      const [date, open, high, low, close, volume] = l.split(",");
      return {
        date:   date?.trim(),
        open:   norm(parseFloat(open)),
        high:   norm(parseFloat(high)),
        low:    norm(parseFloat(low)),
        close:  norm(parseFloat(close)),
        volume: parseInt(volume) || 0,
      };
    })
    .filter(d => d.close > 0);
}

async function quoteStooq(t) {
  const hist = await historyStooq(t, 5);
  if (!hist.length) throw new Error("Stooq no recent data");
  const latest = hist[hist.length - 1];
  const prev   = hist.length > 1 ? hist[hist.length - 2] : null;
  return {
    ticker:    t,
    price:     latest.close,
    change:    prev ? latest.close - prev.close : 0,
    changePct: prev && prev.close ? ((latest.close - prev.close) / prev.close) * 100 : 0,
    volume:    latest.volume,
    avgVolume: hist.reduce((s, d) => s + d.volume, 0) / hist.length,
    high:      latest.high,
    low:       latest.low,
    pe:        null,
    pb:        null,
    name:      t,
  };
}

// ─── SOURCE 3: Yahoo Finance (last resort) ────────────────────────────────────

async function quoteYahoo(t) {
  // Yahoo crumb-free endpoint (không cần crumb cho basic quote)
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${t}.VN?interval=1d&range=5d`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "application/json",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);
  const data = await res.json();
  const meta = data?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error("Yahoo no data");

  return {
    ticker:    t,
    price:     norm(meta.regularMarketPrice ?? meta.previousClose),
    change:    0,
    changePct: 0,
    volume:    meta.regularMarketVolume ?? 0,
    avgVolume: meta.averageDailyVolume3Month ?? 0,
    high:      norm(meta.regularMarketDayHigh ?? meta.regularMarketPrice),
    low:       norm(meta.regularMarketDayLow  ?? meta.regularMarketPrice),
    pe:        null,
    pb:        null,
    name:      meta.longName ?? meta.shortName ?? t,
  };
}

async function historyYahoo(t, days) {
  const to    = Math.floor(Date.now() / 1000);
  const from  = to - days * 86400;
  const url   = `https://query1.finance.yahoo.com/v8/finance/chart/${t}.VN?interval=1d&period1=${from}&period2=${to}`;
  const res   = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`Yahoo history HTTP ${res.status}`);
  const data   = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error("Yahoo no history");

  const timestamps = result.timestamp ?? [];
  const q = result.indicators?.quote?.[0] ?? {};

  return timestamps
    .map((ts, i) => ({
      date:   new Date(ts * 1000).toISOString().slice(0, 10),
      open:   norm(q.open?.[i]),
      high:   norm(q.high?.[i]),
      low:    norm(q.low?.[i]),
      close:  norm(q.close?.[i]),
      volume: q.volume?.[i] ?? 0,
    }))
    .filter(d => d.close > 0);
}

// ─── PUBLIC API (với fallback chain) ─────────────────────────────────────────

export async function getQuote(ticker) {
  const t      = ticker.toUpperCase();
  const errors = [];

  for (const [name, fn] of [
    ["VNDirect", () => quoteVNDirect(t)],
    ["Stooq",    () => quoteStooq(t)],
    ["Yahoo",    () => quoteYahoo(t)],
  ]) {
    try {
      const result = await fn();
      console.log(`[getQuote] ${t} OK via ${name}`);
      return result;
    } catch (e) {
      console.warn(`[getQuote] ${name} failed: ${e.message}`);
      errors.push(`${name}: ${e.message}`);
    }
  }
  throw new Error(`Không lấy được dữ liệu ${t}. (${errors.join(" | ")})`);
}

export async function getHistory(ticker, days = 800) {
  const t      = ticker.toUpperCase();
  const errors = [];

  for (const [name, fn] of [
    ["VNDirect", () => historyVNDirect(t, days)],
    ["Stooq",    () => historyStooq(t, days)],
    ["Yahoo",    () => historyYahoo(t, days)],
  ]) {
    try {
      const result = await fn();
      console.log(`[getHistory] ${t} OK via ${name}, ${result.length} bars`);
      return result;
    } catch (e) {
      console.warn(`[getHistory] ${name} failed: ${e.message}`);
      errors.push(`${name}: ${e.message}`);
    }
  }
  throw new Error(`Không lấy được lịch sử ${t}. (${errors.join(" | ")})`);
}

export async function getRatios(ticker) {
  // VNDirect ratios endpoint
  const t = ticker.toUpperCase();
  try {
    const url = `https://finfo-api.vndirect.com.vn/v4/ratios/latest?filter=code:${t}&fields=pe,pb,roe,eps`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", "Origin": "https://dchart.vndirect.com.vn" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();
    const d    = data?.data?.[0];
    if (!d) return null;
    return {
      pe:             d.pe  ?? null,
      pb:             d.pb  ?? null,
      roe:            d.roe ?? null,
      eps:            d.eps ?? null,
      revenue_growth: null,
      profit_growth:  null,
    };
  } catch (e) {
    console.warn(`[getRatios] ${t} failed: ${e.message}`);
    return null;
  }
}

// ─── SANDO SIGNALS ───────────────────────────────────────────────────────────

export function computeSandoSignals(history, currentPrice) {
  if (!history?.length || history.length < 20) return null;

  const last3y    = history.slice(-756);
  const high3y    = Math.max(...last3y.map(d => d.high));
  const dropPct   = ((high3y - currentPrice) / high3y) * 100;
  const vol20     = last3y.slice(-20).reduce((s, d) => s + d.volume, 0) / 20;
  const vol5      = last3y.slice(-5 ).reduce((s, d) => s + d.volume, 0) / 5;
  const volRatio  = vol20 > 0 ? vol5 / vol20 : 1;
  const closes    = last3y.map(d => d.close);
  const ma20      = sma(closes, 20);
  const ma60      = sma(closes, 60);
  const aboveMa20 = ma20 ? currentPrice > ma20 : false;
  const aboveMa60 = ma60 ? currentPrice > ma60 : false;
  const zone1     = high3y * 0.80;
  const zone2     = high3y * 0.70;
  const zone3     = high3y * 0.60;

  let buyZone = null, buyPercent = 0;
  if      (currentPrice <= zone3) { buyZone = 3; buyPercent = 30; }
  else if (currentPrice <= zone2) { buyZone = 2; buyPercent = 40; }
  else if (currentPrice <= zone1) { buyZone = 1; buyPercent = 30; }

  const momentum = volRatio >= 1.5 && aboveMa20 ? "strong"
                 : volRatio >= 1.0              ? "neutral" : "weak";

  let signal = "WAIT";
  if      (buyZone && momentum !== "weak") signal = "BUY";
  else if (buyZone)                        signal = "WATCH";
  else if (dropPct < 5 && momentum === "strong") signal = "HOLD";

  return {
    high3y, dropFromHigh: dropPct,
    zone1, zone2, zone3, buyZone, buyPercent,
    sellTarget1: currentPrice * 1.20,
    sellTarget2: currentPrice * 1.30,
    sellTarget3: currentPrice * 1.50,
    ma20, ma60, aboveMa20, aboveMa60,
    volRatio, momentum, signal,
  };
}
