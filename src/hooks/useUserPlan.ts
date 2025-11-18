// src/hooks/useUserPlan.ts
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';

type PlanState = {
  plan: 'free' | 'pro';
  active: boolean;
  loading: boolean;
};

export function useUserPlan(): PlanState {
  const [state, setState] = useState<PlanState>({
    plan: 'free',
    active: false,
    loading: true,
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({ plan: 'free', active: false, loading: false });
        return;
      }

      try {
        // Ajuste o caminho se você estiver usando outro:
        // ex: collection(db, 'users', user.uid, 'subscriptions')
        const subsRef = collection(db, 'customers', user.uid, 'subscriptions');

        const q = query(
          subsRef,
          where('status', 'in', ['trialing', 'active'])
        );

        const snap = await getDocs(q);

        if (!snap.empty) {
          // Tem pelo menos 1 assinatura ativa / em trial → PRO
          setState({ plan: 'pro', active: true, loading: false });
        } else {
          setState({ plan: 'free', active: false, loading: false });
        }
      } catch (e) {
        console.error('useUserPlan error', e);
        // Em caso de erro, consideramos free para não bloquear o app
        setState({ plan: 'free', active: false, loading: false });
      }
    });

    return () => unsub();
  }, []);

  return state;
}
