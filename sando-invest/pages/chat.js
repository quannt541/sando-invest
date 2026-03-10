// pages/chat.js — AI Agent chat
import { useState, useRef, useEffect } from "react";
import Nav from "../components/Nav";

const SUGGESTIONS = [
  "VCB hiện có vào vùng mua chưa?",
  "Giải thích công thức FOMO giá vốn 0",
  "Tôi có 500 triệu, nên phân bổ thế nào?",
  "VN đang ở chu kỳ tiền tệ nào?",
  "PB < 1 có phải vùng mua không?",
  "Tại sao không chọn dầu khí?",
  "Khi nào nên bán cổ phiếu?",
  "Sự khác nhau giữa đầu tư kỹ thuật và giá trị?",
];

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput("");
    const next = [...messages, { role: "user", content: msg }];
    setMessages(next);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const json = await res.json();
      setMessages([...next, { role: "assistant", content: json.reply || json.error }]);
    } catch (e) {
      setMessages([...next, { role: "assistant", content: "Lỗi kết nối: " + e.message }]);
    }
    setLoading(false);
  };

  const clear = () => setMessages([]);

  const formatMsg = (text) =>
    text.split("\n").map((line, i) => {
      if (!line.trim()) return <br key={i} />;
      if (line.startsWith("## ")) return (
        <p key={i} style={{ fontFamily: "'Instrument Serif', serif", fontSize: 16, color: "var(--gold)", margin: "12px 0 4px", fontStyle: "italic" }}>
          {line.slice(3)}
        </p>
      );
      if (line.startsWith("- ") || line.startsWith("• ")) return (
        <p key={i} style={{ paddingLeft: 16, position: "relative", color: "var(--text2)", margin: "2px 0", fontSize: 12.5 }}>
          <span style={{ position: "absolute", left: 0, color: "#c8a84b66" }}>—</span>
          {line.slice(2)}
        </p>
      );
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <p key={i} style={{ margin: "2px 0", fontSize: 12.5, color: "var(--text2)" }}>
          {parts.map((p, j) =>
            p.startsWith("**") && p.endsWith("**")
              ? <strong key={j} style={{ color: "var(--text)" }}>{p.slice(2, -2)}</strong>
              : p
          )}
        </p>
      );
    });

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <Nav />
      <div style={{ maxWidth: 760, margin: "0 auto", width: "100%", flex: 1, display: "flex", flexDirection: "column", padding: "0 24px 24px" }}>

        {/* Header */}
        <div style={{ padding: "20px 0 16px", borderBottom: "1px solid var(--border)", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h1 className="serif" style={{ fontSize: 22, marginBottom: 2 }}>AI Investment Agent</h1>
            <p style={{ fontSize: 11, color: "var(--text4)", letterSpacing: "0.04em" }}>
              Framework Sando Triệu · Value Investing · TCBS Data
            </p>
          </div>
          {messages.length > 0 && (
            <button className="btn-ghost" onClick={clear} style={{ fontSize: 11 }}>Xoá chat</button>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14, minHeight: 300, maxHeight: "calc(100vh - 260px)", paddingRight: 4 }}>
          {messages.length === 0 ? (
            <div style={{ paddingTop: 20 }}>
              <p className="serif-italic" style={{ fontSize: 18, color: "var(--text3)", marginBottom: 20 }}>
                "Tiền chuyển từ người thiếu kiên nhẫn sang người kiên nhẫn nhất"
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} onClick={() => send(s)} style={{
                    background: "var(--bg2)",
                    border: "1px solid var(--border2)",
                    color: "var(--text3)",
                    fontSize: 11,
                    padding: "7px 12px",
                    borderRadius: 4,
                    fontFamily: "'DM Mono', monospace",
                    transition: "all 0.15s",
                    textAlign: "left",
                  }}
                  onMouseEnter={e => { e.target.style.borderColor = "#c8a84b55"; e.target.style.color = "var(--gold)"; }}
                  onMouseLeave={e => { e.target.style.borderColor = "var(--border2)"; e.target.style.color = "var(--text3)"; }}
                  >{s}</button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} style={{ display: "flex", gap: 10, flexDirection: m.role === "user" ? "row-reverse" : "row" }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 4, flexShrink: 0, marginTop: 2,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: m.role === "user" ? "var(--border2)" : "var(--gold)",
                  color: m.role === "user" ? "var(--text3)" : "var(--bg)",
                  fontSize: 12, fontFamily: "'Instrument Serif', serif",
                }}>
                  {m.role === "user" ? "Q" : "S"}
                </div>
                <div style={{
                  maxWidth: "82%",
                  background: m.role === "user" ? "var(--bg2)" : "var(--bg3)",
                  border: `1px solid ${m.role === "user" ? "var(--border2)" : "var(--border)"}`,
                  borderRadius: 6, padding: "12px 16px",
                  textAlign: m.role === "user" ? "right" : "left",
                }}>
                  {m.role === "assistant" ? formatMsg(m.content) : (
                    <p style={{ fontSize: 13, color: "var(--text2)" }}>{m.content}</p>
                  )}
                </div>
              </div>
            ))
          )}

          {loading && (
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 4, background: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Instrument Serif', serif", fontSize: 12, color: "var(--bg)", flexShrink: 0 }}>S</div>
              <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "12px 16px", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 6 }}>
                {[0, 0.2, 0.4].map((d, i) => (
                  <div key={i} style={{
                    width: 5, height: 5, borderRadius: "50%", background: "var(--gold)",
                    animation: "pulse 1.2s infinite", animationDelay: `${d}s`,
                  }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Hỏi về cổ phiếu, timing, phân bổ vốn, tâm thế..."
            rows={2}
            style={{ flex: 1, resize: "none", minHeight: 48, maxHeight: 100, lineHeight: 1.5 }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="btn-gold"
            style={{ height: 48, alignSelf: "flex-end", padding: "0 18px", flexShrink: 0 }}
          >
            Gửi
          </button>
        </div>
        <p style={{ fontSize: 10, color: "var(--text4)", textAlign: "center", marginTop: 8, letterSpacing: "0.06em" }}>
          ENTER gửi · SHIFT+ENTER xuống dòng · Không phải lời khuyên tài chính chính thức
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 60%, 100% { opacity: 0.3; transform: scale(1); }
          30% { opacity: 1; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
