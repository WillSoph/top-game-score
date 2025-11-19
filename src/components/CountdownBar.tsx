import { useEffect, useState } from "react";

export default function CountdownBar({
  roundStartedAt,
  maxTimeSec,
  onTimeout,
}: {
  roundStartedAt: { toMillis: () => number };
  maxTimeSec: number;
  onTimeout: () => void;
}) {
  const [pct, setPct] = useState(100);

  useEffect(() => {
    const start = roundStartedAt.toMillis();
    const maxMs = maxTimeSec * 1000;

    function tick() {
      const elapsed = Date.now() - start;
      const left = Math.max(0, maxMs - elapsed);
      const percent = (left / maxMs) * 100;
      setPct(percent);

      if (left <= 0) {
        onTimeout();
      }
    }

    tick();
    const id = setInterval(tick, 100);

    return () => clearInterval(id);
  }, [roundStartedAt, maxTimeSec, onTimeout]);

  return (
    <div className="w-full h-2 bg-slate-800 rounded overflow-hidden">
      <div
        className="h-full bg-emerald-500 transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
