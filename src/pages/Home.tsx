import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
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

/* UI components */
import { ButtonPrimary, ButtonSecondary, ButtonNeon } from '../components/ui/button';
import { Input } from '../components/ui/input';
import FeatureCard from '../components/ui/feature-card';
import FaqItem from '../components/ui/faq-item';
import AvatarCircle from '../components/ui/avatar-circle';
import AuthPanel from '../components/ui/auth-panel';
import PricingPlans from '../components/ui/pricing-plans';
import { useStripeUpgrade } from '../hooks/useStripeUpgrade';

/* ===========================
   Types
=========================== */
type AuthStep = 'none' | 'choose' | 'login' | 'register';

/* ===========================
   Page
=========================== */
export default function Home() {
  const { t, i18n } = useTranslation();
  const { loading: stripeLoading, startCheckout, openPortal } = useStripeUpgrade(); // loading do hook (checkout/portal)
  const nav = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [authStep, setAuthStep] = useState<AuthStep>('none');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false); // <-- loading local para login/register

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
    setAuthLoading(true);
    try {
      await signInWithEmailAndPassword(auth, emailFromUsername(username.trim()), password);
      nav('/dashboard');
    } catch {
      alert(t('home.host.errors.loginGeneric'));
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleRegister() {
    if (!username.trim() || username.includes(' ') || !password) {
      alert(t('home.host.errors.usernameOrPassword'));
      return;
    }
    setAuthLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, emailFromUsername(username.trim()), password);
      nav('/create');
    } catch {
      alert(t('home.host.errors.registerGeneric'));
    } finally {
      setAuthLoading(false);
    }
  }

  // handler do botão Pro
  async function handleSelectPro(billing: 'monthly' | 'annual') {
    if (!auth.currentUser) {
      alert(t('pricing.loginRequired'));
      return;
    }
    alert(t('pricing.redirecting'));
    const res = await startCheckout(billing, i18n.language);
    if (!res.ok && res.reason === 'error') {
      alert(t('pricing.error'));
    }
  }

  // handler do Free (opcional)
  function handleSelectFree() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Portal do cliente (opcional)
  async function handleManageSubscription() {
    if (!auth.currentUser) {
      alert(t('pricing.loginRequired'));
      return;
    }
    alert(t('pricing.redirecting'));
    const res = await openPortal(`${import.meta.env.VITE_SITE_URL}/dashboard`);
    if (!res.ok) alert(t('pricing.error'));
  }

  const hostName =
    user?.displayName ||
    (user?.email ? user.email.split('@')[0] : '') ||
    (user && !user.isAnonymous ? 'host' : '');

  const hostInitials = useMemo(() => {
    return hostName
      ? hostName
          .split(/[._-]/g)
          .filter(Boolean)
          .slice(0, 2)
          .map((s) => s[0]!.toUpperCase())
          .join('')
      : 'H';
  }, [hostName]);

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
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        description: t('seo.description'),
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: t('seo.faq.q1'), acceptedAnswer: { '@type': 'Answer', text: t('seo.faq.a1') } },
          { '@type': 'Question', name: t('seo.faq.q2'), acceptedAnswer: { '@type': 'Answer', text: t('seo.faq.a2') } },
          { '@type': 'Question', name: t('seo.faq.q3'), acceptedAnswer: { '@type': 'Answer', text: t('seo.faq.a3') } },
        ],
      },
    ],
  };

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
                  <AvatarCircle initials={hostInitials} />
                  <span className="truncate text-sm">{hostName}</span>
                </button>
              ) : (
                <ButtonSecondary onClick={() => setAuthStep('login')}>
                  {t('home.modal.login')}
                </ButtonSecondary>
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
                  <AvatarCircle initials={hostInitials} />
                  <span className="truncate text-sm">
                    {hostName} <span className="text-slate-400">· {t('common.dashboard')}</span>
                  </span>
                </button>
              ) : (
                <ButtonSecondary onClick={() => setAuthStep('login')}>
                  {t('home.modal.login')}
                </ButtonSecondary>
              )}
            </div>
          </div>

          {/* H2 + subtitle */}
          <h2 className="mt-3 text-lg sm:text-xl font-semibold text-slate-100">{t('seo.h2')}</h2>
          <p className="mt-2 text-slate-300 text-sm sm:text-base">{t('home.subtitle')}</p>

          {/* Features */}
          <section aria-labelledby="features" className="mt-6 grid gap-4 sm:grid-cols-2">
            <FeatureCard title={t('seo.features.f1.t')} desc={t('seo.features.f1.d')} />
            <FeatureCard title={t('seo.features.f2.t')} desc={t('seo.features.f2.d')} />
            <FeatureCard title={t('seo.features.f3.t')} desc={t('seo.features.f3.d')} />
            <FeatureCard title={t('seo.features.f4.t')} desc={t('seo.features.f4.d')} />
          </section>

          {/* Card principal (CTA + Auth) */}
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm shadow-xl p-4 sm:p-6 space-y-5">
            <ButtonPrimary className="w-full" onClick={handleCreateQuizClick}>
              {t('home.ctaCreateQuiz')}
            </ButtonPrimary>

            {authStep !== 'none' && (
              <div className="pt-1">
                <AuthPanel
                  step={authStep}
                  onBack={() => setAuthStep(authStep === 'choose' ? 'none' : 'choose')}
                  onChooseLogin={() => setAuthStep('login')}
                  onChooseRegister={() => setAuthStep('register')}
                  username={username}
                  password={password}
                  setUsername={setUsername}
                  setPassword={setPassword}
                  onLogin={handleLogin}
                  onRegister={handleRegister}
                  loading={authLoading}
                  t={t as any}
                />
              </div>
            )}
          </div>

          {/* Entrar como player */}
          <div className="mt-6">
            <label className="text-sm sm:text-base text-slate-300">{t('home.join.label')}</label>
            <div className="mt-2 flex flex-col xs:flex-row gap-2">
              <Input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder={t('home.join.placeholder')!}
                inputMode="text"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className="w-full"
              />
              <ButtonNeon
                onClick={() => joinCode && nav(`/play/${joinCode}`)}
                disabled={!joinCode}
                aria-label={t('home.join.button')}
              >
                <LogIn className="h-5 w-5 mr-2" />
                {t('home.join.button')}
              </ButtonNeon>
            </div>
          </div>

          {/* Planos */}
          <PricingPlans
            freeLimit={10}
            onSelectFree={handleSelectFree}
            onSelectPro={handleSelectPro}
            isBusy={stripeLoading === 'checkout'} /* opcional: mostra loading no botão Pro */
          />
          {/* Ex.: botão opcional para abrir o portal
          <div className="mt-3">
            <ButtonSecondary disabled={stripeLoading === 'portal'} onClick={handleManageSubscription}>
              {stripeLoading === 'portal' ? '…' : 'Manage subscription'}
            </ButtonSecondary>
          </div>
          */}

          {/* FAQ visível */}
          <section className="mt-8">
            <h2 className="text-xl font-semibold text-slate-100 mb-3">{t('seo.faq.title')}</h2>
            <div className="space-y-3">
              <FaqItem q={t('seo.faq.q1')} a={t('seo.faq.a1')} />
              <FaqItem q={t('seo.faq.q2')} a={t('seo.faq.a2')} />
              <FaqItem q={t('seo.faq.q3')} a={t('seo.faq.a3')} />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
