import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { CheckCircle2, LayoutDashboard, Home as HomeIcon, LogOut } from 'lucide-react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';

import { auth } from '../lib/firebase';
import Footer from '../components/ui/footer';
import { ButtonPrimary, ButtonSecondary } from '../components/ui/button';

export default function SuccessPage() {
  const { t, i18n } = useTranslation();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<User | null>(null);

  const sessionId = searchParams.get('session_id');
  const siteUrl = import.meta.env.VITE_SITE_URL;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  function handleGoDashboard() {
    nav('/dashboard');
  }

  function handleGoHome() {
    nav('/');
  }

  async function handleLogout() {
    await signOut(auth);
    nav('/');
  }

  return (
    <>
      <Helmet>
        <html lang={i18n.language || 'en'} />
        <title>{t('success.title')}</title>
        <meta name="description" content={t('success.description')} />
        <link rel="canonical" href={`${siteUrl}/success`} />

        {/* Open Graph */}
        <meta property="og:site_name" content="TopGameScore" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${siteUrl}/success`} />
        <meta property="og:title" content={t('success.title')} />
        <meta property="og:description" content={t('success.description')} />
        <meta property="og:image" content={`${siteUrl}/og.png`} />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={t('success.title')} />
        <meta name="twitter:description" content={t('success.description')} />
        <meta name="twitter:image" content={`${siteUrl}/og.png`} />
      </Helmet>

      <div className="min-h-screen flex flex-col pb-safe pt-safe bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,.20),transparent_40%),radial-gradient(ellipse_at_bottom_right,rgba(59,130,246,.18),transparent_40%)]">
        {/* Conteúdo central */}
        <div className="flex-1 mx-auto w-full max-w-3xl px-4 sm:px-6 md:px-8 py-8 sm:py-10 flex items-center">
          <div className="w-full">
            {/* Topo: logo / título simples */}
            <header className="mb-6 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                {t('brand')}
              </h1>
            </header>

            {/* Card principal */}
            <main className="rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-sm shadow-xl p-5 sm:p-7 space-y-5">
              {/* Ícone + título */}
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/40">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl sm:text-2xl font-semibold text-slate-100">
                    {t('success.heading')}
                  </h2>
                  <p className="text-sm sm:text-base text-slate-300">
                    {t('success.body')}
                  </p>
                  {sessionId && (
                    <p className="text-xs text-slate-500 mt-1 break-all">
                      {t('success.sessionLabel')}{' '}
                      <span className="font-mono">
                        {sessionId}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Info do usuário (opcional) */}
              {user && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 sm:p-4 text-sm text-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="font-medium">
                      {t('success.userLine', { email: user.email || t('success.userFallback') })}
                    </div>
                    <div className="text-xs text-slate-400">
                      {t('success.tip')}
                    </div>
                  </div>
                </div>
              )}

              {/* Botões de ação */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <ButtonPrimary
                  onClick={handleGoDashboard}
                  className="flex items-center justify-center gap-2 flex-1"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>{t('success.goDashboard')}</span>
                </ButtonPrimary>

                <ButtonSecondary
                  onClick={handleGoHome}
                  className="flex items-center justify-center gap-2 flex-1"
                >
                  <HomeIcon className="h-4 w-4" />
                  <span>{t('success.goHome')}</span>
                </ButtonSecondary>

                <button
                  onClick={handleLogout}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-medium text-slate-100 flex items-center justify-center gap-2 transition"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{t('success.logout')}</span>
                </button>
              </div>

              {/* Observação sobre cobrança / cancelamento (texto simples) */}
              <p className="text-xs text-slate-500 mt-1">
                {t('success.billingNote')}
              </p>
            </main>
          </div>
        </div>

        {/* Footer global */}
        <Footer />
      </div>
    </>
  );
}
