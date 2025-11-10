import React from 'react';
import { callFn } from '../lib/stripeClient';

export function ManageSubscriptionButton() {
  const onClick = async () => {
    const { url } = await callFn('portal', {});
    window.location.href = url;
  };
  return (
    <button onClick={onClick} className="px-4 py-2 rounded bg-slate-800 border border-slate-700 text-slate-100">
      Gerenciar assinatura
    </button>
  );
}