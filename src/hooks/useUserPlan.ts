// src/hooks/useUserPlan.ts
import { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export function useUserPlan() {
  const [plan, setPlan] = useState<'free'|'pro'|null>(null);
  const [active, setActive] = useState<boolean>(false);

  useEffect(() => {
    const u = auth.currentUser;
    if (!u) return;
    const ref = doc(db, 'users', u.uid);
    return onSnapshot(ref, (snap) => {
      const data = snap.data() || {};
      setPlan((data.plan as any) ?? 'free');
      setActive(!!data.active);
    });
  }, [auth.currentUser?.uid]);

  return { plan, active };
}
