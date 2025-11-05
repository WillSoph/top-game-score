// src/hooks/useGroup.ts
import { doc, onSnapshot, Timestamp } from 'firebase/firestore'; // ⬅️ importa Timestamp
import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';

type Group = {
  status: 'draft' | 'open' | 'finished';
  currentQuestionIndex: number;
  roundStartedAt?: Timestamp | null;
  maxTimeSec: number;
  title: string;
  code: string;
  hostUid?: string;
  createdAt?: Timestamp;
  expiresAt?: Timestamp; // ⬅️ adiciona aqui
};

export function useGroup(groupId: string) {
  const [data, setData] = useState<Group | null>(null);
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'groups', groupId), (snap) =>
      setData((snap.data() as Group) || null)
    );
    return () => unsub();
  }, [groupId]);
  return data;
}
