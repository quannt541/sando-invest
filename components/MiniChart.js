// components/MiniChart.js
import { LineChart, Line, ResponsiveContainer, Tooltip, ReferenceLine } from "recharts";

export default function MiniChart({ data, zone1, zone2, zone3, height = 60 }) {
  if (!data?.length) return null;
  const min = Math.min(...data.map(d => d.close)) * 0.97;
  const max = Math.max(...data.map(d => d.close)) * 1.03;
  const first = data[0]?.close;
  const last = data[data.length - 1]?.close;
  const isUp = last >= first;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        {zone1 && <ReferenceLine y={zone1} stroke="#4caf7d33" strokeDasharray="3 3" />}
        {zone2 && <ReferenceLine y={zone2} stroke="#e0b84b33" strokeDasharray="3 3" />}
        {zone3 && <ReferenceLine y={zone3} stroke="#e0555533" strokeDasharray="3 3" />}
        <Line
          type="monotone"
          dataKey="close"
          stroke={isUp ? "#4caf7d" : "#e05555"}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
        <Tooltip
          contentStyle={{ background: "#111110", border: "1px solid #2a2a20", borderRadius: 4, fontSize: 11 }}
          labelStyle={{ color: "#5a5a4a" }}
          formatter={(v) => [`${v.toFixed(1)}k`, "Giá"]}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
