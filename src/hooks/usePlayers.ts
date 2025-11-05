import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';

export function usePlayers(groupId: string) {
  const [players, setPlayers] = useState<any[]>([]);
  useEffect(()=>{
    const q = query(collection(db,'groups',groupId,'players'), orderBy('totalScore','desc'));
    const unsub = onSnapshot(q, snap=> setPlayers(snap.docs.map(d=>({ id: d.id, ...d.data() }))))
    return ()=>unsub();
  },[groupId]);
  return players;
}
