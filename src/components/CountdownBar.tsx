import { useEffect, useMemo, useState } from 'react';

export default function CountdownBar({ roundStartedAt, maxTimeSec }:{ roundStartedAt: any, maxTimeSec: number }){
  const startMs = useMemo(()=>{
    const t = (roundStartedAt?.toMillis && roundStartedAt.toMillis()) || Date.now();
    return t;
  },[roundStartedAt]);
  const [now, setNow] = useState(Date.now());
  useEffect(()=>{
    const id = setInterval(()=> setNow(Date.now()), 100);
    return ()=>clearInterval(id);
  },[]);
  const elapsed = Math.max(0, now - startMs);
  const maxMs = maxTimeSec * 1000;
  const pct = Math.max(0, 100 - (elapsed/maxMs)*100);
  return (
    <div className="w-full h-2 bg-slate-800 rounded overflow-hidden">
      <div className="h-full bg-emerald-500" style={{ width: pct + '%' }} />
    </div>
  );
}
