import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';

export function useQuestions(groupId: string) {
  const [questions, setQuestions] = useState<any[]>([]);
  useEffect(()=>{
    const q = query(collection(db,'groups',groupId,'questions'), orderBy('index'));
    const unsub = onSnapshot(q, snap=> setQuestions(snap.docs.map(d=>({ id: d.id, ...d.data() }))));
    return ()=>unsub();
  },[groupId]);
  return questions;
}
