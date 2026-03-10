// lib/tcbs.js — Yahoo Finance source (hoạt động trên mọi cloud server)
// Cổ phiếu VN trên Yahoo: VCB.VN, FPT.VN, BID.VN, v.v.

import yahooFinance from "yahoo-finance2";

// Suppress thông báo survey của yahoo-finance2
yahooFinance.setGlobalConfig({ validation: { logErrors: false } });

function toYahooSymbol(ticker) {
  return `${ticker.toUpperCase()}.VN`;
}

function sma(arr, period) {
  if (arr.length < period) return null;
  return arr.slice(-period).reduce((s, v) => s + v, 0) / period;
}

// ─── QUOTE ───────────────────────────────────────────────────────────────────

export async function getQuote(ticker) {
  const t   = ticker.toUpperCase();
  const sym = toYahooSymbol(t);

  const q = await yahooFinance.quote(sym);
  if (!q || !q.regularMarketPrice) {
    throw new Error(`Không tìm thấy mã ${t}`);
  }

  const norm = v => (v && v > 10000 ? v / 1000 : v) ?? 0;

  return {
    ticker:    t,
    price:     norm(q.regularMarketPrice),
    change:    norm(q.regularMarketChange),
    changePct: q.regularMarketChangePercent ?? 0,
    volume:    q.regularMarketVolume   ?? 0,
    avgVolume: q.averageDailyVolume3Month ?? q.averageDailyVolume10Day ?? 0,
    high:      norm(q.regularMarketDayHigh),
    low:       norm(q.regularMarketDayLow),
    pe:        q.trailingPE  ?? null,
    pb:        q.priceToBook ?? null,
    name:      q.longName ?? q.shortName ?? t,
  };
}

// ─── HISTORY ─────────────────────────────────────────────────────────────────

export async function getHistory(ticker, days = 800) {
  const t   = ticker.toUpperCase();
  const sym = toYahooSymbol(t);

  const toDate   = new Date();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  const result = await yahooFinance.historical(sym, {
    period1:  fromDate.toISOString().slice(0, 10),
    period2:  toDate.toISOString().slice(0, 10),
    interval: "1d",
  });

  if (!result || result.length === 0) throw new Error(`Không có lịch sử giá cho ${t}`);

  const norm = v => (v && v > 10000 ? v / 1000 : v) ?? 0;

  return result
    .filter(d => d.close && d.close > 0)
    .map(d => ({
      date:   d.date.toISOString().slice(0, 10),
      open:   norm(d.open)  || norm(d.close),
      high:   norm(d.high)  || norm(d.close),
      low:    norm(d.low)   || norm(d.close),
      close:  norm(d.close),
      volume: d.volume ?? 0,
    }));
}

// ─── RATIOS ──────────────────────────────────────────────────────────────────

export async function getRatios(ticker) {
  const t   = ticker.toUpperCase();
  const sym = toYahooSymbol(t);

  try {
    const summary = await yahooFinance.quoteSummary(sym, {
      modules: ["defaultKeyStatistics", "financialData", "summaryDetail"],
    });

    const ks = summary?.defaultKeyStatistics ?? {};
    const fd = summary?.financialData        ?? {};
    const sd = summary?.summaryDetail        ?? {};

    return {
      pe:             sd.trailingPE      ?? ks.forwardPE        ?? null,
      pb:             ks.priceToBook     ?? sd.priceToBook      ?? null,
      roe:            fd.returnOnEquity  ? parseFloat((fd.returnOnEquity * 100).toFixed(2)) : null,
      eps:            ks.trailingEps     ?? null,
      revenue_growth: fd.revenueGrowth   ?? null,
      profit_growth:  fd.earningsGrowth  ?? null,
    };
  } catch (e) {
    console.warn(`getRatios(${t}) failed:`, e.message);
    return null;
  }
}

// ─── SANDO SIGNALS ───────────────────────────────────────────────────────────

export function computeSandoSignals(history, currentPrice) {
  if (!history?.length || history.length < 20) return null;

  const last3y  = history.slice(-756);
  const high3y  = Math.max(...last3y.map(d => d.high));
  const dropPct = ((high3y - currentPrice) / high3y) * 100;

  const vol20    = last3y.slice(-20).reduce((s, d) => s + d.volume, 0) / 20;
  const vol5     = last3y.slice(-5 ).reduce((s, d) => s + d.volume, 0) / 5;
  const volRatio = vol20 > 0 ? vol5 / vol20 : 1;

  const closes    = last3y.map(d => d.close);
  const ma20      = sma(closes, 20);
  const ma60      = sma(closes, 60);
  const aboveMa20 = ma20 ? currentPrice > ma20 : false;
  const aboveMa60 = ma60 ? currentPrice > ma60 : false;

  const zone1 = high3y * 0.80;
  const zone2 = high3y * 0.70;
  const zone3 = high3y * 0.60;

  let buyZone = null, buyPercent = 0;
  if      (currentPrice <= zone3) { buyZone = 3; buyPercent = 30; }
  else if (currentPrice <= zone2) { buyZone = 2; buyPercent = 40; }
  else if (currentPrice <= zone1) { buyZone = 1; buyPercent = 30; }

  const momentum = volRatio >= 1.5 && aboveMa20 ? "strong"
                 : volRatio >= 1.0              ? "neutral"
                 :                                "weak";

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

// ─── WATCHLIST ───────────────────────────────────────────────────────────────

// Note: SANDO_WATCHLIST đã chuyển sang lib/constants.js
