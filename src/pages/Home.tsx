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

  // Helpers para o avatar
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

  return (
    <>
    <Helmet>
        <html lang={i18n.language || 'en'} />
        <title>{t('seo.title')}</title>
        <meta name="description" content={t('seo.description')} />
        <meta name="keywords" content={t('seo.keywords')} />
        <link rel="canonical" href={import.meta.env.VITE_SITE_URL} />

        {/* Open Graph */}
        <meta property="og:site_name" content="TopGameScore" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={import.meta.env.VITE_SITE_URL} />
        <meta property="og:title" content={t('seo.title')} />
        <meta property="og:description" content={t('seo.description')} />
        <meta property="og:image" content={`${import.meta.env.VITE_SITE_URL}/og.png`} />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={t('seo.title')} />
        <meta name="twitter:description" content={t('seo.description')} />
        <meta name="twitter:image" content={`${import.meta.env.VITE_SITE_URL}/og.png`} />

        {/* Favicons */}
        <link rel="icon" type="image/png" sizes="32x32" href="/favicons/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicons/favicon-16.png" />
        <link rel="apple-touch-icon" href="/favicons/apple-touch-icon.png" />
        <meta name="theme-color" content="#0B1220" />
      </Helmet>
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,.20),transparent_40%),radial-gradient(ellipse_at_bottom_right,rgba(59,130,246,.18),transparent_40%)]">
      <div className="max-w-3xl mx-auto p-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
            {t('app.title')}
          </h1>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />

            {user && !user.isAnonymous ? (
              // Mini avatar + username → leva para o dashboard ao clicar
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

        <p className="mt-2 text-slate-300">
          {t('home.subtitle')}
        </p>

        {/* Card principal */}
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm shadow-xl p-6 space-y-5">
          {/* CTA principal: "Create quiz" sempre visível */}
          <button
            onClick={handleCreateQuizClick}
            className="w-full px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-semibold hover:opacity-90 active:opacity-100 transition"
          >
            {t('home.ctaCreateQuiz')}
          </button>

          {/* Fluxo de auth progressivo */}
          {authStep !== 'none' && (
            <div className="pt-1">
              {authStep === 'choose' && (
                <div className="space-y-3">
                  <h2 className="font-semibold text-slate-200">{t('home.modal.title')}</h2>
                  <div className="flex gap-3">
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
                  <h2 className="font-semibold text-slate-200">
                    {authStep === 'login' ? t('home.modal.loginTitle') : t('home.modal.registerTitle')}
                  </h2>
                  <input
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder={t('home.host.username')!}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                  <input
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder={t('home.host.password')!}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={() => setAuthStep('choose')}
                      className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition"
                    >
                      {t('common.back')}
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

                  <p className="text-xs text-slate-400">
                    {t('home.usernameHint')}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Entrar como player */}
        <div className="mt-6">
          <label className="text-sm text-slate-300">{t('home.join.label')}</label>
          <div className="flex gap-2 mt-2">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder={t('home.join.placeholder')!}
              className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder:text-slate-500 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => joinCode && nav(`/play/${joinCode}`)}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition"
            >
              {t('home.join.button')}
            </button>
          </div>
        </div>

        <p className="mt-4 text-xs text-amber-300/90 border border-amber-500/30 rounded-xl p-3 bg-amber-500/5">
          ⚠️ {t('ttl.warning')}
        </p>
      </div>
    </div>
    </>
  );
}
