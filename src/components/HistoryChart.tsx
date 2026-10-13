import { useMemo } from "react";
import { formatEther } from "viem";
import type { ActivityEvent } from "../hooks/useActivity";

const W = 640, H = 220, L = 8, R = 36, T = 16, B = 8;

const day = (t: number) =>
  new Date(t * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export default function HistoryChart({ events }: { events: ActivityEvent[] }) {
  const d = useMemo(() => {
    const asc = [...events].reverse(); // events arrive newest-first
    if (asc.length === 0) return null;
    const t0 = asc[0].timestamp;
    const t1 = Math.max(Math.floor(Date.now() / 1000), asc[asc.length - 1].timestamp);
    let total = 0;
    const pts = [{ t: t0, v: 0 }];
    const wd: number[] = [];
    for (const e of asc) {
      if (e.type === "contribution") {
        total += Number(formatEther(e.amount));
        pts.push({ t: e.timestamp, v: total });
      } else wd.push(e.timestamp);
    }
    pts.push({ t: t1, v: total });
    const max = Math.max(total * 1.1, 0.001);
    const x = (t: number) => L + ((t - t0) / (t1 - t0 || 1)) * (W - L - R);
    const y = (v: number) => T + (1 - v / max) * (H - T - B);
    return {
      t0, t1, max, x, y,
      line: pts.map((p) => `${x(p.t)},${y(p.v)}`).join(" "),
      wd,
    };
  }, [events]);

  if (!d) {
    return <p className="py-10 text-center text-sm text-muted">No history yet.</p>;
  }

  const fmt = (v: number) => v.toFixed(v < 1 ? 3 : 1);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={L} x2={W - R} y1={d.y(d.max * f)} y2={d.y(d.max * f)} stroke="var(--line)" />
            <text x={W - R + 6} y={d.y(d.max * f) + 4} fontSize="11" fill="var(--muted)">
              {fmt(d.max * f)}
            </text>
          </g>
        ))}
        {d.wd.map((t) => (
          <g key={t}>
            <line x1={d.x(t)} x2={d.x(t)} y1={T} y2={H - B} stroke="var(--muted)" strokeDasharray="3 3" />
            <text x={d.x(t)} y={T - 4} fontSize="10" textAnchor="middle" fill="var(--muted)">
              {day(t)} · withdrawal
            </text>
          </g>
        ))}
        <polyline points={d.line} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" />
      </svg>
      <div className="flex justify-between text-xs text-muted">
        <span>{day(d.t0)}</span>
        <span>{day(d.t1)}</span>
      </div>
    </div>
  );
}