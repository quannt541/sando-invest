// pages/portfolio.js — Danh mục cá nhân: theo dõi vốn, điểm mua, FOMO formula
import { useState, useEffect } from "react";
import Nav from "../components/Nav";

const STORAGE_KEY = "sando_portfolio";

const DEFAULT_PORTFOLIO = {
  totalCapital: 1000, // triệu đồng
  monthlyWage: 20,    // lương tự trả
  positions: [],
};

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState(DEFAULT_PORTFOLIO);
  const [showAdd, setShowAdd] = useState(false);
  const [newPos, setNewPos] = useState({ ticker: "", name: "", avgPrice: "", quantity: "", zone: 1 });
  const [liveData, setLiveData] = useState({});

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setPortfolio(JSON.parse(saved));
    } catch {}
  }, []);

  // Save to localStorage
  const save = (p) => {
    setPortfolio(p);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  };

  // Fetch live prices for positions
  useEffect(() => {
    if (!portfolio.positions.length) return;
    portfolio.positions.forEach(async (pos) => {
      try {
        const res = await fetch(`/api/stock?ticker=${pos.ticker}`);
        const json = await res.json();
        if (!json.error) {
          setLiveData(prev => ({ ...prev, [pos.ticker]: json }));
        }
      } catch {}
    });
  }, [portfolio.positions.length]);

  const addPosition = () => {
    if (!newPos.ticker || !newPos.avgPrice || !newPos.quantity) return;
    const pos = {
      id: Date.now(),
      ticker: newPos.ticker.toUpperCase(),
      name: newPos.name,
      avgPrice: parseFloat(newPos.avgPrice),
      quantity: parseInt(newPos.quantity),
      zone: newPos.zone,
      buyDate: new Date().toISOString().slice(0, 10),
      fomoShares: 0, // shares with cost = 0
    };
    save({ ...portfolio, positions: [...portfolio.positions, pos] });
    setNewPos({ ticker: "", name: "", avgPrice: "", quantity: "", zone: 1 });
    setShowAdd(false);
  };

  const removePosition = (id) => {
    save({ ...portfolio, positions: portfolio.positions.filter(p => p.id !== id) });
  };

  // Totals
  const totalInvested = portfolio.positions.reduce((s, p) => s + p.avgPrice * p.quantity, 0);
  const totalMarket = portfolio.positions.reduce((s, p) => {
    const live = liveData[p.ticker]?.quote?.price;
    return s + (live || p.avgPrice) * p.quantity;
  }, 0);
  const totalPnL = totalMarket - totalInvested;
  const totalPnLPct = totalInvested ? (totalPnL / totalInvested) * 100 : 0;
  const capitalLeft = portfolio.totalCapital - totalInvested;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Nav />
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 24px" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
          <h1 className="serif" style={{ fontSize: 26 }}>Danh mục của tôi</h1>
          <button className="btn-gold" onClick={() => setShowAdd(!showAdd)}>+ Thêm vị thế</button>
        </div>

        {/* Capital config */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 12 }}>
            Cấu hình vốn — Tư duy công ty
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
            <CapStat
              label="Vốn CSH (fix cứng)"
              value={`${portfolio.totalCapital.toFixed(0)}tr`}
              sub="Không được rút"
              color="var(--gold)"
            />
            <CapStat
              label="Đã đầu tư"
              value={`${totalInvested.toFixed(0)}tr`}
              sub={`${totalInvested ? ((totalInvested / portfolio.totalCapital) * 100).toFixed(0) : 0}% vốn`}
              color="var(--text)"
            />
            <CapStat
              label="Còn lại"
              value={`${capitalLeft.toFixed(0)}tr`}
              sub="Sẵn sàng mua"
              color={capitalLeft < 100 ? "var(--red)" : "var(--green)"}
            />
            <CapStat
              label="Lương tháng"
              value={`${portfolio.monthlyWage}tr`}
              sub="Trả cho mình dù lãi/lỗ"
              color="var(--text3)"
            />
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "var(--text4)" }}>Vốn:</span>
              <input
                type="number"
                value={portfolio.totalCapital}
                onChange={e => save({ ...portfolio, totalCapital: parseFloat(e.target.value) || 0 })}
                style={{ width: 90, padding: "5px 10px", fontSize: 12 }}
              />
              <span style={{ fontSize: 11, color: "var(--text4)" }}>triệu</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "var(--text4)" }}>Lương/tháng:</span>
              <input
                type="number"
                value={portfolio.monthlyWage}
                onChange={e => save({ ...portfolio, monthlyWage: parseFloat(e.target.value) || 0 })}
                style={{ width: 70, padding: "5px 10px", fontSize: 12 }}
              />
              <span style={{ fontSize: 11, color: "var(--text4)" }}>triệu</span>
            </div>
          </div>
        </div>

        {/* P&L summary */}
        {portfolio.positions.length > 0 && (
          <div className="card" style={{ marginBottom: 16, borderColor: totalPnL >= 0 ? "#4caf7d33" : "#e0555533" }}>
            <div style={{ display: "flex", gap: 32 }}>
              <div>
                <div style={{ fontSize: 10, color: "var(--text4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Giá trị thị trường</div>
                <div className="serif" style={{ fontSize: 22 }}>{totalMarket.toFixed(0)}tr</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "var(--text4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>P&L</div>
                <div className="serif" style={{ fontSize: 22, color: totalPnL >= 0 ? "var(--green)" : "var(--red)" }}>
                  {totalPnL >= 0 ? "+" : ""}{totalPnL.toFixed(0)}tr ({totalPnLPct.toFixed(1)}%)
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add position form */}
        {showAdd && (
          <div className="card" style={{ marginBottom: 16, borderColor: "var(--gold)33" }}>
            <div style={{ fontSize: 11, color: "var(--gold)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Thêm vị thế mới
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 10, color: "var(--text4)", display: "block", marginBottom: 4 }}>Mã CK *</label>
                <input value={newPos.ticker} onChange={e => setNewPos({...newPos, ticker: e.target.value.toUpperCase()})} placeholder="VCB" style={{ textTransform: "uppercase" }} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: "var(--text4)", display: "block", marginBottom: 4 }}>Tên</label>
                <input value={newPos.name} onChange={e => setNewPos({...newPos, name: e.target.value})} placeholder="Vietcombank" />
              </div>
              <div>
                <label style={{ fontSize: 10, color: "var(--text4)", display: "block", marginBottom: 4 }}>Giá TB mua (k) *</label>
                <input type="number" value={newPos.avgPrice} onChange={e => setNewPos({...newPos, avgPrice: e.target.value})} placeholder="85.0" />
              </div>
              <div>
                <label style={{ fontSize: 10, color: "var(--text4)", display: "block", marginBottom: 4 }}>Số lượng *</label>
                <input type="number" value={newPos.quantity} onChange={e => setNewPos({...newPos, quantity: e.target.value})} placeholder="1000" />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-gold" onClick={addPosition}>Thêm</button>
              <button className="btn-ghost" onClick={() => setShowAdd(false)}>Huỷ</button>
            </div>
          </div>
        )}

        {/* Positions table */}
        {portfolio.positions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text4)" }}>
            <div className="serif-italic" style={{ fontSize: 20, marginBottom: 8, color: "var(--text3)" }}>Chưa có vị thế nào</div>
            <div style={{ fontSize: 12 }}>Thêm cổ phiếu đầu tiên để bắt đầu theo dõi</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {portfolio.positions.map(pos => (
              <PositionRow key={pos.id} pos={pos} live={liveData[pos.ticker]} onRemove={() => removePosition(pos.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PositionRow({ pos, live, onRemove }) {
  const livePrice = live?.quote?.price;
  const signals = live?.signals;
  const pnlPerShare = livePrice ? livePrice - pos.avgPrice : 0;
  const pnlTotal = pnlPerShare * pos.quantity;
  const pnlPct = (pnlPerShare / pos.avgPrice) * 100;

  // Sell signals
  const sell1 = pos.avgPrice * 1.20;
  const sell2 = pos.avgPrice * 1.30;
  const shouldSell1 = livePrice >= sell1;
  const shouldSell2 = livePrice >= sell2;

  return (
    <div className="card" style={{
      borderColor: shouldSell2 ? "#e0555544" : shouldSell1 ? "#e0b84b44" :
                   signals?.buyZone ? "#4caf7d44" : "var(--border)"
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr 1fr 1fr auto", gap: 16, alignItems: "center" }}>
        <div>
          <div className="serif" style={{ fontSize: 18 }}>{pos.ticker}</div>
          <div style={{ fontSize: 10, color: "var(--text4)" }}>{pos.name}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "var(--text4)", marginBottom: 2 }}>Giá TB mua</div>
          <div style={{ fontSize: 14 }}>{pos.avgPrice.toFixed(1)}k</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "var(--text4)", marginBottom: 2 }}>Giá hiện tại</div>
          <div style={{ fontSize: 14, color: pnlPerShare >= 0 ? "var(--green)" : "var(--red)" }}>
            {livePrice ? `${livePrice.toFixed(1)}k` : "—"}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "var(--text4)", marginBottom: 2 }}>P&L</div>
          <div style={{ fontSize: 14, color: pnlTotal >= 0 ? "var(--green)" : "var(--red)" }}>
            {livePrice ? `${pnlTotal >= 0 ? "+" : ""}${(pnlTotal * 1).toFixed(0)}tr (${pnlPct.toFixed(1)}%)` : "—"}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "var(--text4)", marginBottom: 4 }}>Điểm bán</div>
          <div style={{ fontSize: 11, color: shouldSell1 ? "var(--red)" : "var(--text4)" }}>
            +20%: {sell1.toFixed(1)}k {shouldSell1 ? "⚡ BÁN 30%" : ""}
          </div>
          <div style={{ fontSize: 11, color: shouldSell2 ? "var(--red)" : "var(--text4)" }}>
            +30%: {sell2.toFixed(1)}k {shouldSell2 ? "⚡ BÁN 50%" : ""}
          </div>
        </div>
        <button onClick={onRemove} style={{
          background: "transparent", border: "none",
          color: "var(--text4)", fontSize: 16, padding: "4px 8px"
        }}>×</button>
      </div>
    </div>
  );
}

function CapStat({ label, value, sub, color }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "var(--text4)", marginBottom: 4, letterSpacing: "0.04em" }}>{label}</div>
      <div className="serif" style={{ fontSize: 20, color }}>{value}</div>
      <div style={{ fontSize: 10, color: "var(--text4)", marginTop: 2 }}>{sub}</div>
    </div>
  );
}
