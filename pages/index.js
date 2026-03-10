// pages/index.js — Watchlist: tất cả mã Sando-approved + signal thực tế
import { useState, useEffect } from "react";
import Nav from "../components/Nav";
import SignalBadge from "../components/SignalBadge";
import MiniChart from "../components/MiniChart";
import Link from "next/link";

export default function WatchlistPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchWatchlist = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/watchlist");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json.watchlist);
      setLastUpdated(new Date().toLocaleTimeString("vi-VN"));
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  useEffect(() => { fetchWatchlist(); }, []);

  const buyCount = data.filter(d => d.signals?.signal === "BUY").length;
  const watchCount = data.filter(d => d.signals?.signal === "WATCH").length;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Nav />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 className="serif" style={{ fontSize: 26, color: "var(--text)", marginBottom: 4 }}>
              Watchlist
            </h1>
            <p style={{ color: "var(--text4)", fontSize: 11, letterSpacing: "0.06em" }}>
              {lastUpdated ? `Cập nhật lúc ${lastUpdated}` : "Đang tải dữ liệu từ TCBS..."}
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {!loading && (
              <>
                {buyCount > 0 && (
                  <span style={{ fontSize: 11, color: "var(--green)" }}>
                    {buyCount} mã vào vùng mua
                  </span>
                )}
                {watchCount > 0 && (
                  <span style={{ fontSize: 11, color: "var(--gold)" }}>
                    {watchCount} mã cần theo dõi
                  </span>
                )}
              </>
            )}
            <button className="btn-ghost" onClick={fetchWatchlist} disabled={loading}>
              {loading ? <span className="spin" /> : "↻ Refresh"}
            </button>
          </div>
        </div>

        {/* Alert banner if any BUY signal */}
        {buyCount > 0 && (
          <div style={{
            background: "#4caf7d11",
            border: "1px solid #4caf7d33",
            borderRadius: 8,
            padding: "12px 18px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            <span style={{ color: "var(--green)", fontSize: 16 }}>⚡</span>
            <span style={{ color: "var(--green)", fontSize: 12 }}>
              <strong>{buyCount} mã đang trong vùng mua</strong> — Kiểm tra chu kỳ tiền tệ trước khi hành động
            </span>
          </div>
        )}

        {error && (
          <div style={{ color: "var(--red)", fontSize: 12, padding: "12px 0" }}>{error}</div>
        )}

        {/* Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 14,
        }}>
          {loading
            ? Array(8).fill(0).map((_, i) => (
                <div key={i} className="card" style={{ height: 180, opacity: 0.4 }}>
                  <div style={{ background: "var(--border2)", borderRadius: 4, height: 14, width: "40%", marginBottom: 12 }} />
                  <div style={{ background: "var(--border)", borderRadius: 4, height: 10, width: "60%", marginBottom: 8 }} />
                  <div style={{ background: "var(--border)", borderRadius: 4, height: 60, marginTop: 16 }} />
                </div>
              ))
            : data.map((item) => (
                <StockCard key={item.ticker} item={item} />
              ))
          }
        </div>

        <div style={{ marginTop: 32, padding: "16px 0", borderTop: "1px solid var(--border)" }}>
          <p style={{ fontSize: 10, color: "var(--text4)", letterSpacing: "0.06em", textAlign: "center" }}>
            DỮ LIỆU TỪ TCBS PUBLIC API · KHÔNG PHẢI LỜI KHUYÊN TÀI CHÍNH CHÍNH THỨC · FRAMEWORK: SANDO TRIỆU
          </p>
        </div>
      </div>
    </div>
  );
}

function StockCard({ item }) {
  const { ticker, name, sector, grade, quote, signals } = item;
  if (!quote) return null;

  const isUp = quote.changePct >= 0;

  return (
    <Link href={`/analyze?ticker=${ticker}`} style={{ textDecoration: "none" }}>
      <div className="card" style={{
        cursor: "pointer",
        transition: "border-color 0.15s",
        borderColor: signals?.signal === "BUY" ? "#4caf7d33" :
                     signals?.signal === "WATCH" ? "#c8a84b33" : "var(--border)",
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "var(--gold)"}
      onMouseLeave={e => e.currentTarget.style.borderColor = signals?.signal === "BUY" ? "#4caf7d33" : signals?.signal === "WATCH" ? "#c8a84b33" : "var(--border)"}
      >
        {/* Top row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 18, color: "var(--text)" }}>{ticker}</span>
              <span style={{ fontSize: 10, color: "var(--text4)", letterSpacing: "0.06em" }}>{grade}</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--text4)", marginTop: 1 }}>{name} · {sector}</div>
          </div>
          {signals?.signal && <SignalBadge signal={signals.signal} />}
        </div>

        {/* Price */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 22, fontFamily: "'Instrument Serif', serif", color: "var(--text)" }}>
            {quote.price.toFixed(1)}k
          </span>
          <span style={{ fontSize: 12, color: isUp ? "var(--green)" : "var(--red)" }}>
            {isUp ? "+" : ""}{quote.changePct.toFixed(2)}%
          </span>
        </div>

        {/* Mini chart */}
        {item.priceHistory?.length ? (
          <MiniChart
            data={item.priceHistory}
            zone1={signals?.zone1}
            zone2={signals?.zone2}
            height={55}
          />
        ) : null}

        {/* Buy zone info */}
        {signals && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, color: "var(--text4)" }}>
              Từ đỉnh 3 năm
            </span>
            <span style={{ fontSize: 11, color: signals.dropFromHigh >= 20 ? "var(--green)" : "var(--text3)" }}>
              -{signals.dropFromHigh.toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
