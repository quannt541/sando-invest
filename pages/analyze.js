// pages/analyze.js — Phân tích chi tiết 1 mã + AI analysis
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Nav from "../components/Nav";
import SignalBadge from "../components/SignalBadge";
import MiniChart from "../components/MiniChart";
import { SANDO_WATCHLIST } from "../lib/constants";

export default function AnalyzePage() {
  const router = useRouter();
  const [ticker, setTicker] = useState("");
  const [inputVal, setInputVal] = useState("");
  const [stockData, setStockData] = useState(null);
  const [analysis, setAnalysis] = useState("");
  const [loadingStock, setLoadingStock] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (router.query.ticker) {
      const t = router.query.ticker.toUpperCase();
      setInputVal(t);
      fetchStock(t);
    }
  }, [router.query.ticker]);

  const fetchStock = async (t) => {
    const sym = (t || inputVal).trim().toUpperCase();
    if (!sym) return;
    setTicker(sym);
    setStockData(null);
    setAnalysis("");
    setError(null);
    setLoadingStock(true);

    try {
      const res = await fetch(`/api/stock?ticker=${sym}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setStockData(json);
    } catch (e) {
      setError(e.message);
    }
    setLoadingStock(false);
  };

  const runAIAnalysis = async () => {
    if (!stockData) return;
    setLoadingAI(true);
    setAnalysis("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: stockData.ticker,
          quote: stockData.quote,
          signals: stockData.signals,
          ratios: stockData.ratios,
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setAnalysis(json.analysis);
    } catch (e) {
      setAnalysis("Lỗi khi phân tích: " + e.message);
    }
    setLoadingAI(false);
  };

  const s = stockData;
  const sig = s?.signals;
  const q = s?.quote;
  const r = s?.ratios;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Nav />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px" }}>

        {/* Search */}
        <div style={{ marginBottom: 28 }}>
          <h1 className="serif" style={{ fontSize: 26, marginBottom: 16 }}>Phân tích cổ phiếu</h1>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={inputVal}
              onChange={e => setInputVal(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && fetchStock()}
              placeholder="Nhập mã: VCB, FPT, HPG..."
              style={{ maxWidth: 220, textTransform: "uppercase" }}
            />
            <button className="btn-gold" onClick={() => fetchStock()} disabled={loadingStock || !inputVal.trim()}>
              {loadingStock ? <span className="spin" /> : "Phân tích"}
            </button>
          </div>

          {/* Quick picks */}
          <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
            {SANDO_WATCHLIST.map(w => (
              <button key={w.ticker} className="btn-ghost"
                onClick={() => { setInputVal(w.ticker); fetchStock(w.ticker); }}
                style={{ fontSize: 11, padding: "5px 10px" }}
              >{w.ticker}</button>
            ))}
          </div>
        </div>

        {error && <div style={{ color: "var(--red)", fontSize: 13, marginBottom: 16 }}>{error}</div>}

        {loadingStock && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text4)", fontSize: 12 }}>
            <span className="spin" /> Đang lấy dữ liệu từ TCBS...
          </div>
        )}

        {s && sig && q && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Top summary card */}
            <div className="card" style={{
              borderColor: sig.signal === "BUY" ? "#4caf7d44" : sig.signal === "WATCH" ? "#c8a84b44" : "var(--border)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                    <span className="serif" style={{ fontSize: 28 }}>{s.ticker}</span>
                    <SignalBadge signal={sig.signal} size="lg" />
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                    <span className="serif" style={{ fontSize: 32 }}>{q.price.toFixed(1)}k</span>
                    <span style={{ color: q.changePct >= 0 ? "var(--green)" : "var(--red)", fontSize: 14 }}>
                      {q.changePct >= 0 ? "+" : ""}{q.changePct.toFixed(2)}%
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "var(--text4)", marginBottom: 4 }}>ĐỈNH 3 NĂM</div>
                  <div className="serif" style={{ fontSize: 20 }}>{sig.high3y.toFixed(1)}k</div>
                  <div style={{ fontSize: 12, color: sig.dropFromHigh >= 20 ? "var(--green)" : "var(--text3)", marginTop: 4 }}>
                    Giảm {sig.dropFromHigh.toFixed(1)}% từ đỉnh
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div style={{ marginTop: 16 }}>
                <MiniChart
                  data={s.priceHistory}
                  zone1={sig.zone1}
                  zone2={sig.zone2}
                  zone3={sig.zone3}
                  height={100}
                />
                <div style={{ display: "flex", gap: 16, marginTop: 6, fontSize: 10, color: "var(--text4)" }}>
                  <span style={{ color: "#4caf7d88" }}>— Zone 1 (-20%)</span>
                  <span style={{ color: "#e0b84b88" }}>— Zone 2 (-30%)</span>
                  <span style={{ color: "#e0555588" }}>— Zone 3 (-40%)</span>
                </div>
              </div>
            </div>

            {/* 3 columns: Buy zones | Sell targets | Ratios */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>

              {/* Buy zones */}
              <div className="card">
                <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 14 }}>
                  Vùng mua
                </div>
                {[
                  { label: "Zone 1 (−20%)", price: sig.zone1, pct: 30, zone: 1 },
                  { label: "Zone 2 (−30%)", price: sig.zone2, pct: 40, zone: 2 },
                  { label: "Zone 3 (−40%)", price: sig.zone3, pct: 30, zone: 3 },
                ].map(z => {
                  const active = q.price <= z.price;
                  return (
                    <div key={z.zone} style={{
                      padding: "10px 12px",
                      borderRadius: 6,
                      border: `1px solid ${active ? "#4caf7d44" : "var(--border)"}`,
                      background: active ? "#4caf7d08" : "transparent",
                      marginBottom: 8,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                        <span style={{ fontSize: 11, color: active ? "var(--green)" : "var(--text4)" }}>{z.label}</span>
                        {active && <span style={{ fontSize: 10, color: "var(--green)" }}>✓ TRONG VÙNG</span>}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 15, fontFamily: "'Instrument Serif', serif" }}>{z.price.toFixed(1)}k</span>
                        <span style={{ fontSize: 11, color: "var(--gold)" }}>Mua {z.pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Sell targets */}
              <div className="card">
                <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 14 }}>
                  Điểm bán
                </div>
                {[
                  { label: "+20%", price: sig.sellTarget1, action: "Bán 30% SL" },
                  { label: "+30%", price: sig.sellTarget2, action: "Bán 50% còn lại" },
                  { label: "+50%", price: sig.sellTarget3, action: "Bán 20% cuối" },
                ].map((t, i) => (
                  <div key={i} style={{
                    padding: "10px 12px",
                    borderRadius: 6,
                    border: "1px solid var(--border)",
                    marginBottom: 8,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                      <span style={{ fontSize: 11, color: "var(--text4)" }}>{t.label}</span>
                      <span style={{ fontSize: 10, color: "var(--red)" }}>{t.action}</span>
                    </div>
                    <span style={{ fontSize: 15, fontFamily: "'Instrument Serif', serif" }}>{t.price.toFixed(1)}k</span>
                  </div>
                ))}
              </div>

              {/* Momentum + Ratios */}
              <div className="card">
                <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 14 }}>
                  Momentum & Chỉ số
                </div>
                <Row label="Volume ratio" value={`${sig.volRatio.toFixed(2)}x`}
                  good={sig.volRatio >= 1.5} warn={sig.volRatio >= 1} />
                <Row label="MA20" value={`${sig.ma20.toFixed(1)}k`}
                  good={sig.aboveMa20} warn={false} below={!sig.aboveMa20} />
                <Row label="MA60" value={`${sig.ma60.toFixed(1)}k`}
                  good={sig.aboveMa60} warn={false} below={!sig.aboveMa60} />
                <Row label="Momentum" value={sig.momentum.toUpperCase()}
                  good={sig.momentum === "strong"} warn={sig.momentum === "neutral"} />
                {r && (
                  <>
                    <div className="divider" />
                    {r.pe && <Row label="PE" value={r.pe.toFixed(2)} />}
                    {r.pb && <Row label="PB" value={r.pb.toFixed(2)} good={r.pb < 1.5} />}
                    {r.roe && <Row label="ROE" value={(r.roe * 100).toFixed(1) + "%"} good={r.roe > 0.15} />}
                    {r.profit_growth && <Row label="LN tăng trưởng" value={(r.profit_growth * 100).toFixed(1) + "%"} good={r.profit_growth > 0} />}
                  </>
                )}
              </div>
            </div>

            {/* AI Analysis */}
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 4 }}>
                    Phân tích AI — Sando Framework
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text4)" }}>
                    Dựa trên 3 tiêu chí vàng + dữ liệu thực tế
                  </div>
                </div>
                <button className="btn-gold" onClick={runAIAnalysis} disabled={loadingAI}>
                  {loadingAI ? <><span className="spin" style={{ marginRight: 6 }} /> Đang phân tích...</> : "🤖 Phân tích AI"}
                </button>
              </div>

              {loadingAI && (
                <div style={{ color: "var(--text4)", fontSize: 12, padding: "8px 0" }}>
                  Claude đang phân tích theo framework Sando Triệu...
                </div>
              )}

              {analysis && (
                <div style={{
                  background: "var(--bg3)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  padding: "16px",
                  fontSize: 13,
                  lineHeight: 1.7,
                  color: "var(--text2)",
                  whiteSpace: "pre-wrap",
                }}>
                  {analysis}
                </div>
              )}

              {!analysis && !loadingAI && (
                <div style={{ color: "var(--text4)", fontSize: 12, textAlign: "center", padding: "20px 0" }}>
                  Nhấn "Phân tích AI" để nhận đánh giá chi tiết từ Claude theo framework Sando Triệu
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, good, warn, below }) {
  const color = good ? "var(--green)" : warn ? "var(--yellow)" : below ? "var(--red)" : "var(--text2)";
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ fontSize: 11, color: "var(--text4)" }}>{label}</span>
      <span style={{ fontSize: 12, color }}>{value}</span>
    </div>
  );
}
