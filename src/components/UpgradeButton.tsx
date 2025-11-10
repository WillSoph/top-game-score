// UpgradeButton.tsx
import React from 'react';
import { callFn } from '../lib/stripeClient';

export function UpgradeButton() {
  const onClick = async () => {
    const { url } = await callFn('checkout', { plan: 'monthly', locale: 'pt' });
    window.location.href = url;
  };
  return (
    <button onClick={onClick} className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white">
      Fazer upgrade
    </button>
  );
}
