import { Trophy, Crown } from "lucide-react";

type Player = {
  id: string;
  name?: string;
  handle?: string;
  totalScore?: number;
};

export default function Leaderboard({ players }: { players: Player[] }) {
  // defensivo: ordena por score desc e quebra por nome
  const sorted = [...(players ?? [])].sort((a, b) => {
    const sa = a.totalScore ?? 0;
    const sb = b.totalScore ?? 0;
    if (sb !== sa) return sb - sa;
    return (a.name ?? "").localeCompare(b.name ?? "");
  });

  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  const max = Math.max(1, ...sorted.map((p) => p.totalScore ?? 0));

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wide text-slate-200">
          Leaderboard
        </h3>
        {!!sorted.length && (
          <span className="text-[11px] text-slate-400">
            {sorted.length} player{sorted.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Empty state */}
      {!sorted.length && (
        <div className="rounded-lg border border-dashed border-slate-800 p-6 text-center">
          <p className="text-sm text-slate-400">No players yet</p>
          <p className="text-xs text-slate-500">Share the join link to start</p>
        </div>
      )}

      {/* Podium */}
      {!!sorted.length && (
        <div className="grid grid-cols-3 gap-2">
          {top3.map((p, i) => (
            <PodiumCard
              key={p.id}
              rank={(i + 1) as 1 | 2 | 3}
              name={p.name ?? "Player"}
              handle={p.handle}
              score={p.totalScore ?? 0}
            />
          ))}
        </div>
      )}

      {/* Others */}
      {!!rest.length && (
        <ol className="mt-4 max-h-64 space-y-1 overflow-auto pr-1">
          {rest.map((p, idx) => (
            <li
              key={p.id}
              className="group relative overflow-hidden rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2"
            >
              {/* progress strip */}
              <div
                className="absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b from-emerald-400/80 to-cyan-400/80"
                style={{
                  opacity: Math.max(0.2, (p.totalScore ?? 0) / max),
                }}
              />
              <div className="flex items-center gap-3">
                <RankBadge rank={idx + 4} />
                <Avatar
                  label={(p.name ?? "P")[0]}
                  hint={p.handle || p.name || "Player"}
                />
                <div className="min-w-0">
                  <div className="truncate text-sm text-slate-200">
                    {p.name ?? "Player"}
                    {p.handle && (
                      <span className="ml-1 text-xs text-slate-400">
                        ({p.handle})
                      </span>
                    )}
                  </div>
                  <div className="mt-1 h-1.5 w-44 rounded-full bg-slate-800">
                    <div
                      className="h-1.5 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-[width] duration-500"
                      style={{
                        width: `${Math.max(
                          8,
                          Math.round(((p.totalScore ?? 0) / max) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="ml-auto font-mono text-sm tabular-nums text-slate-200">
                  {p.totalScore ?? 0}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/* ---------- subcomponents ---------- */

function PodiumCard({
  rank,
  name,
  handle,
  score,
}: {
  rank: 1 | 2 | 3;
  name: string;
  handle?: string;
  score: number;
}) {
  const medal =
    rank === 1
      ? "from-amber-400 to-yellow-500"
      : rank === 2
      ? "from-slate-300 to-slate-400"
      : "from-amber-700 to-amber-600";

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-center">
      <div
        className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-b ${medal} text-slate-900 shadow`}
        title={`#${rank}`}
      >
        {rank === 1 ? <Crown size={18} /> : <Trophy size={16} />}
      </div>
      <div className="mt-2 truncate text-sm font-medium text-slate-100">
        #{rank} {name}
      </div>
      {handle && (
        <div className="truncate text-[11px] text-slate-400">{handle}</div>
      )}
      <div className="mx-auto mt-2 inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-xs text-emerald-300">
        {score}
      </div>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-800 text-xs font-semibold text-slate-300">
      {rank}
    </span>
  );
}

function Avatar({ label, hint }: { label: string; hint?: string }) {
  return (
    <div
      className="flex h-7 w-7 shrink-0 select-none items-center justify-center rounded-full bg-slate-800 text-[11px] font-semibold text-slate-200"
      title={hint}
      aria-label={hint}
    >
      {label.toUpperCase()}
    </div>
  );
}
