// src/hooks/useUserPlan.ts
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';

type Plan = 'free' | 'pro';

type PlanState = {
  plan: Plan;
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
    // observa login / logout
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({ plan: 'free', active: false, loading: false });
        return;
      }

      const userRef = doc(db, 'users', user.uid);

      // tenta ler uma vez (pra não ficar carregando infinito)
      try {
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          // se ainda não existir doc, considera free
          setState({ plan: 'free', active: false, loading: false });
        } else {
          const data = snap.data() as any;
          const plan: Plan = data.plan === 'pro' ? 'pro' : 'free';
          const active = Boolean(data.active);

          setState({ plan, active, loading: false });
        }
      } catch (err) {
        console.error('useUserPlan initial read error', err);
        setState({ plan: 'free', active: false, loading: false });
      }

      // assina em tempo real para refletir updates do webhook
      const unsubDoc = onSnapshot(
        userRef,
        (snap) => {
          if (!snap.exists()) {
            setState((prev) => ({ ...prev, plan: 'free', active: false, loading: false }));
          } else {
            const data = snap.data() as any;
            const plan: Plan = data.plan === 'pro' ? 'pro' : 'free';
            const active = Boolean(data.active);

            setState({ plan, active, loading: false });
          }
        },
        (error) => {
          console.error('useUserPlan onSnapshot error', error);
        }
      );

      return () => {
        unsubDoc();
      };
    });

    return () => {
      unsubAuth();
    };
  }, []);

  return state;
}
