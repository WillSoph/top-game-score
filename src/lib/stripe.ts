// src/lib/stripe.ts
export type Billing = 'monthly' | 'annual';

async function callFn<T>(path: string, body: unknown, idToken?: string): Promise<T> {
  const res = await fetch(`/.netlify/functions/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function createCheckoutSession(opts: {
  plan: Billing;
  locale?: string;
  idToken: string;
}): Promise<{ url: string }> {
  return callFn<{ url: string }>('checkout-create', { plan: opts.plan, locale: opts.locale }, opts.idToken);
}

export async function createBillingPortal(opts: {
  idToken: string;
  returnUrl?: string;
}): Promise<{ url: string }> {
  return callFn<{ url: string }>(
    'portal-create',
    { returnUrl: opts.returnUrl },
    opts.idToken
  );
}
