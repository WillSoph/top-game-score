import { collection, onSnapshot } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { db } from '../lib/firebase';

type Player = { id: string; name?: string; handle?: string };

export function useLeaderboard(groupId: string){
  const [players, setPlayers] = useState<Player[]>([]);
  const [answers, setAnswers] = useState<any[]>([]);

  useEffect(()=>{
    const unsubP = onSnapshot(collection(db,'groups',groupId,'players'), snap=>{
      setPlayers(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    });
    const unsubA = onSnapshot(collection(db,'groups',groupId,'answers'), snap=>{
      setAnswers(snap.docs.map(d => d.data()));
    });
    return ()=>{ unsubP(); unsubA(); };
  },[groupId]);

  const rows = useMemo(()=>{
    const byPlayer = new Map<string, number>();
    for (const a of answers) {
      const prev = byPlayer.get(a.playerId) ?? 0;
      byPlayer.set(a.playerId, prev + (a.scoreAwarded ?? 0));
    }
    const full = [...byPlayer.entries()].map(([id, totalScore])=>{
      const p = players.find(x=>x.id===id);
      return { id, name: p?.name ?? 'Player', handle: p?.handle ?? '', totalScore };
    });
    full.sort((a,b)=> b.totalScore - a.totalScore);
    return full;
  }, [answers, players]);

  return rows;
}
