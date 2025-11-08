import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { LogIn } from 'lucide-react';

type AuthStep = 'none' | 'choose' | 'login' | 'register';

export default function Home() {
  const { t, i18n } = useTranslation();
  const nav = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [authStep, setAuthStep] = useState<AuthStep>('none');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const emailFromUsername = (u: string) => `${u}@host.local`;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  function handleCreateQuizClick() {
    if (user && !user.isAnonymous) {
      nav('/create');
      return;
    }
    setAuthStep('choose');
  }

  async function handleLogin() {
    if (!username.trim() || username.includes(' ') || !password) {
      alert(t('home.host.errors.usernameOrPassword'));
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, emailFromUsername(username.trim()), password);
      nav('/dashboard');
    } catch {
      alert(t('home.host.errors.loginGeneric'));
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    if (!username.trim() || username.includes(' ') || !password) {
      alert(t('home.host.errors.usernameOrPassword'));
      return;
    }
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, emailFromUsername(username.trim()), password);
      nav('/create');
    } catch {
      alert(t('home.host.errors.registerGeneric'));
    } finally {
      setLoading(false);
    }
  }

  const hostName =
    user?.displayName ||
    (user?.email ? user.email.split('@')[0] : '') ||
    (user && !user.isAnonymous ? 'host' : '');

  const hostInitials = hostName
    ? hostName
        .split(/[._-]/g)
        .filter(Boolean)
        .slice(0, 2)
        .map((s) => s[0]!.toUpperCase())
        .join('')
    : 'H';

  const siteUrl = import.meta.env.VITE_SITE_URL;

  // JSON-LD (WebSite + SoftwareApplication + FAQPage)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: 'TopGameScore',
        url: siteUrl,
        inLanguage: i18n.language || 'en',
        potentialAction: {
          '@type': 'SearchAction',
          target: `${siteUrl}/?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'SoftwareApplication',
        name: t('seo.appName'),
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Web',
        url: siteUrl,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, // free (pode ajustar)
        description: t('seo.description'),
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: t('seo.faq.q1'),
            acceptedAnswer: { '@type': 'Answer', text: t('seo.faq.a1') },
          },
          {
            '@type': 'Question',
            name: t('seo.faq.q2'),
            acceptedAnswer: { '@type': 'Answer', text: t('seo.faq.a2') },
          },
          {
            '@type': 'Question',
            name: t('seo.faq.q3'),
            acceptedAnswer: { '@type': 'Answer', text: t('seo.faq.a3') },
          },
        ],
      },
    ],
  };

  // hreflang alternates (URLs com ?lng=)
  const alternates = [
    { lang: 'x-default', href: `${siteUrl}` },
    { lang: 'en', href: `${siteUrl}?lng=en` },
    { lang: 'pt', href: `${siteUrl}?lng=pt` },
    { lang: 'es', href: `${siteUrl}?lng=es` },
  ];

  return (
    <>
      <Helmet>
        <html lang={i18n.language || 'en'} />
        <title>{t('seo.title')}</title>
        <meta name="description" content={t('seo.description')} />
        {/* Meta keywords não ranqueiam sozinhas, mas não atrapalham */}
        <meta name="keywords" content={t('seo.keywords')} />
        <link rel="canonical" href={siteUrl} />
        {alternates.map((a) => (
          <link key={a.lang} rel="alternate" hrefLang={a.lang} href={a.href} />
        ))}

        {/* Open Graph */}
        <meta property="og:site_name" content="TopGameScore" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={siteUrl} />
        <meta property="og:title" content={t('seo.title')} />
        <meta property="og:description" content={t('seo.description')} />
        <meta property="og:image" content={`${siteUrl}/og.png`} />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={t('seo.title')} />
        <meta name="twitter:description" content={t('seo.description')} />
        <meta name="twitter:image" content={`${siteUrl}/og.png`} />

        {/* Favicons */}
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#0B1220" />

        {/* JSON-LD */}
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      {/* BG */}
      <div className="min-h-screen pb-safe pt-safe bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,.20),transparent_40%),radial-gradient(ellipse_at_bottom_right,rgba(59,130,246,.18),transparent_40%)]">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 md:px-8 py-5 sm:py-6 md:py-8">
          {/* Top bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
              {t('app.title')}
            </h1>

            {/* mobile */}
            <div className="flex items-center justify-between sm:hidden">
              <LanguageSwitcher />
              {user && !user.isAnonymous ? (
                <button
                  onClick={() => nav('/dashboard')}
                  className="group flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-slate-900/70 border border-slate-700 text-slate-200 hover:bg-slate-800 transition"
                  title={t('common.dashboard')}
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full font-semibold bg-gradient-to-br from-emerald-500 to-blue-500 text-white">
                    {hostInitials}
                  </span>
                  <span className="truncate text-sm">{hostName}</span>
                </button>
              ) : (
                <button
                  onClick={() => setAuthStep('login')}
                  className="px-3 py-2 rounded-lg bg-slate-800/70 border border-slate-700 text-slate-200 hover:bg-slate-700 transition text-sm"
                >
                  {t('home.modal.login')}
                </button>
              )}
            </div>

            {/* desktop */}
            <div className="hidden sm:flex items-center gap-3">
              <LanguageSwitcher />
              {user && !user.isAnonymous ? (
                <button
                  onClick={() => nav('/dashboard')}
                  className="group flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-full bg-slate-900/70 border border-slate-700 text-slate-200 hover:bg-slate-800 transition max-w-[220px]"
                  title={t('common.dashboard')}
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full font-semibold bg-gradient-to-br from-emerald-500 to-blue-500 text-white">
                    {hostInitials}
                  </span>
                  <span className="truncate text-sm">
                    {hostName} <span className="text-slate-400">· {t('common.dashboard')}</span>
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => setAuthStep('login')}
                  className="px-4 py-2 rounded-lg bg-slate-800/70 border border-slate-700 text-slate-200 hover:bg-slate-700 transition"
                >
                  {t('home.modal.login')}
                </button>
              )}
            </div>
          </div>

          {/* H2 com termos fortes */}
          <h2 className="mt-3 text-lg sm:text-xl font-semibold text-slate-100">
            {t('seo.h2')}
          </h2>
          <p className="mt-2 text-slate-300 text-sm sm:text-base">{t('home.subtitle')}</p>

          {/* Features com palavras-chave (visíveis) */}
          <section aria-labelledby="features" className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <h3 className="font-semibold mb-1">{t('seo.features.f1.t')}</h3>
              <p className="text-sm text-slate-300">{t('seo.features.f1.d')}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <h3 className="font-semibold mb-1">{t('seo.features.f2.t')}</h3>
              <p className="text-sm text-slate-300">{t('seo.features.f2.d')}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <h3 className="font-semibold mb-1">{t('seo.features.f3.t')}</h3>
              <p className="text-sm text-slate-300">{t('seo.features.f3.d')}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <h3 className="font-semibold mb-1">{t('seo.features.f4.t')}</h3>
              <p className="text-sm text-slate-300">{t('seo.features.f4.d')}</p>
            </div>
          </section>

          {/* Card principal */}
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm shadow-xl p-4 sm:p-6 space-y-5">
            <button
              onClick={handleCreateQuizClick}
              className="w-full px-4 sm:px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-semibold hover:opacity-90 active:opacity-100 transition text-base sm:text-lg"
            >
              {t('home.ctaCreateQuiz')}
            </button>

            {authStep !== 'none' && (
              <div className="pt-1">
                {authStep === 'choose' && (
                  <div className="space-y-3">
                    <h2 className="font-semibold text-slate-200 text-base sm:text-lg">
                      {t('home.modal.title')}
                    </h2>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <button
                        onClick={() => setAuthStep('login')}
                        className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition"
                      >
                        {t('home.modal.login')}
                      </button>
                      <button
                        onClick={() => setAuthStep('register')}
                        className="flex-1 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition"
                      >
                        {t('home.modal.register')}
                      </button>
                    </div>
                  </div>
                )}

                {(authStep === 'login' || authStep === 'register') && (
                  <div className="space-y-3">
                    <h2 className="font-semibold text-slate-200 text-base sm:text-lg">
                      {authStep === 'login'
                        ? t('home.modal.loginTitle')
                        : t('home.modal.registerTitle')}
                    </h2>
                    <input
                      className="w-full px-3 py-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder={t('home.host.username')!}
                      inputMode="email"
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                    <input
                      className="w-full px-3 py-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder={t('home.host.password')!}
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />

                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => setAuthStep('choose')}
                        className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition"
                      >
                        ← {t('common.back')}
                      </button>

                      {authStep === 'login' ? (
                        <button
                          onClick={handleLogin}
                          disabled={loading}
                          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition"
                        >
                          {t('home.modal.login')}
                        </button>
                      ) : (
                        <button
                          onClick={handleRegister}
                          disabled={loading}
                          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 transition"
                        >
                          {t('home.modal.register')}
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-slate-400">{t('home.usernameHint')}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Entrar como player */}
          <div className="mt-6">
            <label className="text-sm sm:text-base text-slate-300">
              {t('home.join.label')}
            </label>
            <div className="mt-2 flex flex-col xs:flex-row gap-2">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder={t('home.join.placeholder')!}
                className="px-3 py-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder:text-slate-500 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                inputMode="text"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <button
                onClick={() => joinCode && nav(`/play/${joinCode}`)}
                disabled={!joinCode}
                aria-label={t('home.join.button')}
                className="group inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold
                          text-slate-900 transition
                          bg-gradient-to-r from-emerald-400 via-lime-400 to-emerald-500
                          hover:from-emerald-300 hover:via-lime-300 hover:to-emerald-400
                          shadow-[0_0_0_1px_rgba(16,185,129,.55),0_10px_30px_-10px_rgba(163,230,53,.65)]
                          focus:outline-none focus:ring-2 focus:ring-emerald-400/60
                          disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <LogIn className="h-5 w-5 opacity-90 transition group-hover:translate-x-0.5" />
                {t('home.join.button')}
              </button>
            </div>
          </div>

          {/* FAQ visível (casa com JSON-LD) */}
          <section className="mt-8">
            <h2 className="text-xl font-semibold text-slate-100 mb-3">{t('seo.faq.title')}</h2>
            <div className="space-y-3">
              <details className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                <summary className="font-medium cursor-pointer">{t('seo.faq.q1')}</summary>
                <p className="mt-2 text-sm text-slate-300">{t('seo.faq.a1')}</p>
              </details>
              <details className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                <summary className="font-medium cursor-pointer">{t('seo.faq.q2')}</summary>
                <p className="mt-2 text-sm text-slate-300">{t('seo.faq.a2')}</p>
              </details>
              <details className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                <summary className="font-medium cursor-pointer">{t('seo.faq.q3')}</summary>
                <p className="mt-2 text-sm text-slate-300">{t('seo.faq.a3')}</p>
              </details>
            </div>
          </section>

          <p className="mt-4 text-xs sm:text-sm text-amber-300/90 border border-amber-500/30 rounded-xl p-3 bg-amber-500/5">
            ⚠️ {t('ttl.warning')}
          </p>
        </div>
      </div>
    </>
  );
}
