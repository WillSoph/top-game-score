import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ButtonNeon, ButtonPrimary } from './button';
import { cn } from '../../lib/utils';

type Billing = 'monthly' | 'annual';

type PricingPlansProps = {
  freeLimit?: number;
  onSelectPro?: (billing: Billing) => void;
  onSelectFree?: () => void;
  className?: string;
  /** Quando true, mostra loading e desabilita o CTA do Pro */
  isBusy?: boolean;
};

export default function PricingPlans({
  freeLimit = 10,
  onSelectPro,
  onSelectFree,
  className,
  isBusy = false,
}: PricingPlansProps) {
  const { t } = useTranslation();
  const [billing, setBilling] = useState<Billing>('monthly');

  const plans = {
    free: {
      name: t('pricing.plans.free.name'),
      price:
        billing === 'annual'
          ? t('pricing.plans.free.priceAnnual')
          : t('pricing.plans.free.priceMonthly'),
      cta: t('pricing.plans.free.cta'),
      features:
        ((t('pricing.plans.free.features', { returnObjects: true, limit: freeLimit }) as unknown) as string[]) ||
        [],
    },
    pro: {
      name: t('pricing.plans.pro.name'),
      price:
        billing === 'annual'
          ? t('pricing.plans.pro.priceAnnual')
          : t('pricing.plans.pro.priceMonthly'),
      cta: t('pricing.plans.pro.cta'),
      features:
        ((t('pricing.plans.pro.features', { returnObjects: true }) as unknown) as string[]) || [],
    },
  };

  return (
    <section aria-labelledby="pricing" className={cn('mt-8', className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="pricing" className="text-xl font-semibold text-slate-100">
            {t('pricing.title')}
          </h2>
          <p className="text-slate-300 text-sm">{t('pricing.subtitle')}</p>
        </div>

        <div className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-900/60 p-1">
          <button
            onClick={() => setBilling('monthly')}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm',
              billing === 'monthly' ? 'bg-slate-800 text-white' : 'text-slate-300'
            )}
          >
            {t('pricing.billingToggle.monthly')}
          </button>
          <button
            onClick={() => setBilling('annual')}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm',
              billing === 'annual' ? 'bg-slate-800 text-white' : 'text-slate-300'
            )}
          >
            {t('pricing.billingToggle.annual')}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {/* Free */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h3 className="text-lg font-semibold text-slate-100">{plans.free.name}</h3>
          <div className="mt-1 text-3xl font-extrabold text-slate-100">{plans.free.price}</div>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            {plans.free.features.map((f, i) => (
              <li key={i} className="flex gap-2">
                <span>•</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <ButtonPrimary className="mt-5 w-full" onClick={onSelectFree}>
            {plans.free.cta}
          </ButtonPrimary>
        </div>

        {/* Pro */}
        <div className="rounded-2xl border border-emerald-700/40 bg-gradient-to-b from-slate-900/70 to-slate-900/40 p-5 shadow-[0_0_0_1px_rgba(16,185,129,.25)]">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-100">{plans.pro.name}</h3>
            <span className="text-xs rounded-full px-2 py-1 bg-emerald-600 text-white">
              Popular
            </span>
          </div>
          <div className="mt-1 text-3xl font-extrabold text-slate-100">{plans.pro.price}</div>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            {plans.pro.features.map((f, i) => (
              <li key={i} className="flex gap-2">
                <span>•</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <ButtonNeon
            className="mt-5 w-full"
            onClick={() => onSelectPro?.(billing)}
            disabled={isBusy}
            aria-busy={isBusy}
          >
            {isBusy && (
              <svg
                className="mr-2 h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
            )}
            {plans.pro.cta}
          </ButtonNeon>
          <p className="mt-2 text-xs text-slate-400">{t('pricing.footnote')}</p>
        </div>
      </div>
    </section>
  );
}
