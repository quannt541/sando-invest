// components/SignalBadge.js
export default function SignalBadge({ signal, size = "sm" }) {
  const map = {
    BUY:   { cls: "tag-buy",  label: "MUA" },
    WATCH: { cls: "tag-hold", label: "THEO DÕI" },
    WAIT:  { cls: "tag-wait", label: "CHỜ" },
    HOLD:  { cls: "tag-hold", label: "GIỮ" },
    SELL:  { cls: "tag-sell", label: "BÁN" },
  };
  const { cls, label } = map[signal] || map["WAIT"];
  return (
    <span className={`tag ${cls}`} style={size === "lg" ? { fontSize: 12, padding: "5px 12px" } : {}}>
      {label}
    </span>
  );
}
