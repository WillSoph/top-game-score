export default function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-slate-300">{desc}</p>
    </div>
  );
}