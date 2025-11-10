export default function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
      <summary className="font-medium cursor-pointer">{q}</summary>
      <p className="mt-2 text-sm text-slate-300">{a}</p>
    </details>
  );
}