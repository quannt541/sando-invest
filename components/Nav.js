// components/Nav.js
import Link from "next/link";
import { useRouter } from "next/router";

const links = [
  { href: "/", label: "Watchlist" },
  { href: "/analyze", label: "Phân tích" },
  { href: "/portfolio", label: "Danh mục" },
  { href: "/chat", label: "AI Agent" },
];

export default function Nav() {
  const router = useRouter();
  return (
    <nav style={{
      background: "#0d0d0b",
      borderBottom: "1px solid #1e1e18",
      padding: "0 24px",
      display: "flex",
      alignItems: "center",
      gap: 0,
      height: 52,
      position: "sticky",
      top: 0,
      zIndex: 100,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 32 }}>
        <div style={{
          width: 28, height: 28,
          background: "#c8a84b",
          borderRadius: 5,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Instrument Serif', serif",
          fontSize: 15, color: "#0a0a08",
        }}>S</div>
        <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 16, color: "#e8e3d8" }}>
          Sando Invest
        </span>
      </div>
      <div style={{ display: "flex", gap: 2, flex: 1 }}>
        {links.map((l) => {
          const active = router.pathname === l.href;
          return (
            <Link key={l.href} href={l.href} style={{
              padding: "6px 14px",
              borderRadius: 5,
              fontSize: 12,
              letterSpacing: "0.04em",
              color: active ? "#c8a84b" : "#5a5a4a",
              background: active ? "#c8a84b14" : "transparent",
              textDecoration: "none",
              transition: "all 0.15s",
              fontFamily: "'DM Mono', monospace",
            }}
            onMouseEnter={e => { if (!active) e.target.style.color = "#8a8070"; }}
            onMouseLeave={e => { if (!active) e.target.style.color = "#5a5a4a"; }}
            >{l.label}</Link>
          );
        })}
      </div>
      <span style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#2a2a20" }}>
        Value Investing · Sando Method
      </span>
    </nav>
  );
}
