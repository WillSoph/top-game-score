import CountdownBar from './CountdownBar';

export default function LiveQuestion({
  q,
  onChoose,
  onTimeout,
  roundStartedAt,
  maxTimeSec,
  answeredIndex,
}: {
  q: any;
  onChoose: (i: number) => void;
  onTimeout: () => void;
  roundStartedAt: any;
  maxTimeSec: number;
  answeredIndex: number | null;
}) {
  if (!q) return <div className="italic text-slate-400">Waiting…</div>;

  return (
    <div className="space-y-3">
      <CountdownBar
        roundStartedAt={roundStartedAt}
        maxTimeSec={maxTimeSec}
        onTimeout={onTimeout}
      />

      <div className="text-lg font-medium">{q.text}</div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {q.options?.map((opt: string, i: number) => (
          <button
            key={i}
            disabled={answeredIndex !== null}
            onClick={() => onChoose(i)}
            className={`px-3 py-3 rounded border border-slate-800 hover:bg-slate-800 text-left ${
              answeredIndex === i ? 'bg-slate-800' : ''
            }`}
          >
            {i + 1}. {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
