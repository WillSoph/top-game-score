// src/hooks/useStripeUpgrade.ts
import { useState, useCallback } from 'react';
import { auth } from '../lib/firebase';
import {
  createCheckoutSession,
  createBillingPortal,
  cancelSubscription as cancelSubscriptionApi,
  Billing,
} from '../lib/stripe';

export function useStripeUpgrade() {
  const [loading, setLoading] = useState<'checkout' | 'portal' | 'cancel' | null>(null);

  const startCheckout = useCallback(async (plan: Billing, locale?: string) => {
    const user = auth.currentUser;
    if (!user) return { ok: false as const, reason: 'not_logged' as const };

    setLoading('checkout');
    try {
      const idToken = await user.getIdToken();
      const { url } = await createCheckoutSession({ plan, locale, idToken });
      window.location.assign(url);
      return { ok: true as const };
    } catch (e) {
      console.error('startCheckout error', e);
      return { ok: false as const, reason: 'error' as const };
    } finally {
      setLoading(null);
    }
  }, []);

    const cancelSubscription = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      return { ok: false as const, reason: 'not_logged' as const };
    }

    setLoading('cancel');
    try {
      const idToken = await user.getIdToken();
      const res = await cancelSubscriptionApi({ idToken });

      if (!res.ok) {
        return { ok: false as const, reason: 'error' as const };
      }

      return {
        ok: true as const,
        currentPeriodEnd: res.current_period_end, // timestamp (segundos)
      };
    } catch (e) {
      console.error('cancelSubscription error', e);
      return { ok: false as const, reason: 'error' as const };
    } finally {
      setLoading(null);
    }
  }, []);


  const openPortal = useCallback(async (returnUrl?: string) => {
    const user = auth.currentUser;
    if (!user) return { ok: false as const, reason: 'not_logged' as const };

    setLoading('portal');
    try {
      const idToken = await user.getIdToken();
      const { url } = await createBillingPortal({ idToken, returnUrl });
      window.location.assign(url);
      return { ok: true as const };
    } catch (e) {
      console.error('openPortal error', e);
      return { ok: false as const, reason: 'error' as const };
    } finally {
      setLoading(null);
    }
  }, []);

  return { loading, startCheckout, openPortal, cancelSubscription };
}
