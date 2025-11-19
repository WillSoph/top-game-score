import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState, useRef } from 'react';
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
import Dialog from '../components/ui/dialog';
import Footer from '../components/ui/footer';

/* ===========================
   Types
=========================== */
type AuthStep = 'none' | 'choose' | 'login' | 'register';

/* ===========================
   Page
=========================== */
export default function Home() {
  const { t, i18n } = useTranslation();
  const { loading: stripeLoading, startCheckout, openPortal } = useStripeUpgrade();
  const nav = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [authStep, setAuthStep] = useState<AuthStep>('none');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState(''); // email real para registro/reset
  const [authLoading, setAuthLoading] = useState(false);

  // Dialog state
  const [dlgOpen, setDlgOpen] = useState(false);
  const [dlgTitle, setDlgTitle] = useState<string>('');
  const [dlgMsg, setDlgMsg] = useState<React.ReactNode>('');
  const [dlgVariant, setDlgVariant] = useState<'info' | 'success' | 'warning' | 'danger'>('info');

  // ref para a seção de autenticação (card principal)
  const authSectionRef = useRef<HTMLDivElement | null>(null);

  function openDialog(
    title: string,
    msg: React.ReactNode,
    variant: 'info' | 'success' | 'warning' | 'danger' = 'info'
  ) {
    setDlgTitle(title);
    setDlgMsg(msg);
    setDlgVariant(variant);
    setDlgOpen(true);
  }

  // helper: aceita username simples ou e-mail
  function toLoginEmail(input: string) {
    const v = input.trim();
    return v.includes('@') ? v : `${v}@host.local`;
  }

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
    // rola para o card de auth também, para já ver as opções
    if (authSectionRef.current) {
      authSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // handler para "Entrar" no topo
  function handleTopLoginClick() {
    setAuthStep('login');
    // scroll suave até o card de autenticação
    if (authSectionRef.current) {
      authSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /* ===========================
     Auth handlers
  =========================== */
  async function handleLogin() {
    const id = username.trim();
    if (!id || id.includes(' ') || !password) {
      openDialog(t('common.attention'), t('home.host.errors.usernameOrPassword'), 'warning');
      return;
    }
    setAuthLoading(true);
    try {
      await signInWithEmailAndPassword(auth, toLoginEmail(id), password);
      nav('/dashboard');
    } catch (e) {
      openDialog(t('common.error'), t('home.host.errors.loginGeneric'), 'danger');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleRegister() {
    const id = username.trim();
    const em = email.trim();
    if (!id || id.includes(' ') || !password || !em || !/^\S+@\S+\.\S+$/.test(em)) {
      openDialog(t('common.attention'), t('home.host.errors.usernamePasswordEmail'), 'warning');
      return;
    }
    setAuthLoading(true);
    try {
      // registra com email real
      await createUserWithEmailAndPassword(auth, em, password);
      nav('/create');
    } catch (e) {
      openDialog(t('common.error'), t('home.host.errors.registerGeneric'), 'danger');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleForgotPassword() {
    const em = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(em)) {
      openDialog(t('common.attention'), t('home.host.errors.validEmailRequired'), 'warning');
      return;
    }
    try {
      const { sendPasswordResetEmail } = await import('firebase/auth');
      await sendPasswordResetEmail(auth, em);
      openDialog(t('common.success'), t('home.host.resetPassword.sent'), 'success');
    } catch (e) {
      openDialog(t('common.error'), t('home.host.resetPassword.failed'), 'danger');
    }
  }

  /* ===========================
     Pricing / Stripe handlers
  =========================== */
  async function handleSelectPro(billing: 'monthly' | 'annual') {
    if (!auth.currentUser) {
      openDialog(t('common.attention'), t('pricing.loginRequired'), 'warning');
      return;
    }
    openDialog(t('pricing.title'), t('pricing.redirecting'), 'info');
    const res = await startCheckout(billing, i18n.language);
    if (!res.ok && res.reason === 'error') {
      openDialog(t('common.error'), t('pricing.error'), 'danger');
    }
  }

  function handleSelectFree() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleManageSubscription() {
    if (!auth.currentUser) {
      openDialog(t('common.attention'), t('pricing.loginRequired'), 'warning');
      return;
    }
    openDialog(t('pricing.title'), t('pricing.redirecting'), 'info');
    const res = await openPortal(`${import.meta.env.VITE_SITE_URL}/dashboard`);
    if (!res.ok) {
      openDialog(t('common.error'), t('pricing.error'), 'danger');
    }
  }

  /* ===========================
     Derived UI
  =========================== */
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
        <div
          className="
            mx-auto 
            w-full 
            max-w-6xl 
            px-4 
            sm:px-6 
            md:px-10 
            py-5 
            sm:py-8 
            md:py-12
          "
        >
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
                <ButtonSecondary onClick={handleTopLoginClick}>
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
                <ButtonSecondary onClick={handleTopLoginClick}>
                  {t('home.modal.login')}
                </ButtonSecondary>
              )}
            </div>
          </div>

          {/* H2 + subtitle */}
          <h2 className="mt-3 text-lg sm:text-xl font-semibold text-slate-100">
            {t('seo.h2')}
          </h2>
          <p className="mt-2 text-slate-300 text-sm sm:text-base">{t('home.subtitle')}</p>

          {/* Features */}
          <section
            aria-labelledby="features"
            className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            <FeatureCard title={t('seo.features.f1.t')} desc={t('seo.features.f1.d')} />
            <FeatureCard title={t('seo.features.f2.t')} desc={t('seo.features.f2.d')} />
            <FeatureCard title={t('seo.features.f3.t')} desc={t('seo.features.f3.d')} />
            <FeatureCard title={t('seo.features.f4.t')} desc={t('seo.features.f4.d')} />
          </section>

          {/* Card principal (CTA + Auth) */}
          <div
            ref={authSectionRef}
            className="mt-12 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl shadow-2xl p-6 sm:p-8 space-y-6"
          >
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
                  // novos props conectando as funções novas:
                  email={email}
                  setEmail={setEmail}
                  onForgotPassword={handleForgotPassword}
                  onLogin={handleLogin}
                  onRegister={handleRegister}
                  loading={authLoading}
                  t={t as any}
                />
              </div>
            )}
          </div>

          {/* Entrar como player */}
          <div className="mt-12 rounded-xl border border-slate-800 bg-slate-900/30 p-6 shadow-lg">
            <label className="text-sm sm:text-base text-slate-300">
              {t('home.join.label')}
            </label>
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
          <div className="mt-14 rounded-2xl border border-slate-800 bg-slate-900/30 p-8 shadow-xl">
            <PricingPlans
              freeLimit={10}
              onSelectFree={handleSelectFree}
              onSelectPro={handleSelectPro}
              isBusy={stripeLoading === 'checkout'}
            />
          </div>

          {/* FAQ visível */}
          <section className="mt-14 rounded-xl border border-slate-800 bg-slate-900/20 p-6 sm:p-8 shadow-lg">
            <h2 className="text-xl font-semibold text-slate-100 mb-3">
              {t('seo.faq.title')}
            </h2>
            <div className="space-y-3">
              <FaqItem q={t('seo.faq.q1')} a={t('seo.faq.a1')} />
              <FaqItem q={t('seo.faq.q2')} a={t('seo.faq.a2')} />
              <FaqItem q={t('seo.faq.q3')} a={t('seo.faq.a3')} />
            </div>
          </section>
        </div>
      </div>

      {/* Dialog global */}
      <Dialog
        open={dlgOpen}
        onClose={() => setDlgOpen(false)}
        title={dlgTitle}
        description={dlgMsg}
        variant={dlgVariant}
      />

      <Footer />
    </>
  );
}
