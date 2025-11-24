import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Flag, Play, Link as LinkIcon, Check } from 'lucide-react';

import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

import { useGroup } from '../hooks/useGroup';
import { useQuestions } from '../hooks/useQuestions';
import { usePlayers } from '../hooks/usePlayers';
import { useUserPlan } from '../hooks/useUserPlan';

import QuestionEditor from '../components/QuestionEditor';
import Leaderboard from '../components/Leaderboard';

export default function HostPage() {
  const { t } = useTranslation();
  const { groupId } = useParams();
  const nav = useNavigate();

  const group = useGroup(groupId!);
  const questions = useQuestions(groupId!);
  const playersBoard = usePlayers(groupId!);

  const { plan, active } = useUserPlan();
  const isPro = plan === 'pro' && active;

  const [copied, setCopied] = useState(false);

  // “toast” simples
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    type: 'success' | 'error';
  }>({ open: false, message: '', type: 'success' });

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ open: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, open: false }));
    }, 2500);
  }

  function requireHost() {
    const u = auth.currentUser;
    const isAnon = !u || u.isAnonymous;
    if (!u || isAnon) {
      alert(t('host.mustSignIn'));
      nav('/');
      return null;
    }
    return u;
  }

  // Garantir que o hostUid esteja preenchido
  useEffect(() => {
    const u = auth.currentUser;
    if (!groupId || !group || !u || u.isAnonymous) return;
    const hostUid = (group as any)?.hostUid;
    if (!hostUid || hostUid === '') {
      updateDoc(doc(db, 'groups', groupId), { hostUid: u.uid }).catch((e) =>
        console.error('claim hostUid failed', e)
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, (group as any)?.hostUid]);

  function getDaysLeft(expiresAt?: any) {
    if (!expiresAt) return null;
    const exp = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt);
    const now = new Date();
    const diffMs = exp.getTime() - now.getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  }

  async function openQuiz() {
    const u = requireHost();
    if (!u) return;
    const updates: any = { status: 'open', roundStartedAt: null };
    const hostUid = (group as any)?.hostUid;
    if (!hostUid || hostUid === '') updates.hostUid = u.uid;
    try {
      await updateDoc(doc(db, 'groups', groupId!), updates);
      showToast(t('host.toast.opened', 'Quiz iniciado com sucesso!'), 'success');
    } catch {
      showToast(t('host.errors.open', 'Erro ao abrir o quiz.'), 'error');
    }
  }

  async function finishQuiz() {
    const u = requireHost();
    if (!u) return;
    try {
      await updateDoc(doc(db, 'groups', groupId!), { status: 'finished' });
      showToast(t('host.toast.finished', 'Quiz finalizado!'), 'success');
      nav(`/finished/${groupId}`);
    } catch {
      showToast(t('host.errors.finish', 'Erro ao finalizar o quiz.'), 'error');
    }
  }

  const playerPath = useMemo(() => `/play/${groupId}`, [groupId]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        `${import.meta.env.VITE_SITE_URL?.replace(/\/$/, '')}${playerPath}`
      );
    } catch {
      await navigator.clipboard.writeText(playerPath);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  const statusColor =
    group?.status === 'open'
      ? 'bg-emerald-600/15 text-emerald-300 ring-1 ring-emerald-700/50'
      : group?.status === 'finished'
      ? 'bg-rose-600/15 text-rose-300 ring-1 ring-rose-700/50'
      : 'bg-slate-600/20 text-slate-300 ring-1 ring-slate-700/50';

  const siteUrl = import.meta.env.VITE_SITE_URL;

  return (
    <>
      <Helmet>
        <title>{`${t('brand')} — ${t('seo.title')}`}</title>
        <meta name="description" content={t('seo.description')} />
        <link rel="canonical" href={`${siteUrl}/play/${groupId}`} />
        <meta name="robots" content="noindex,follow" />
      </Helmet>

      <div className="min-h-screen pb-safe pt-safe bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,.20),transparent_40%),radial-gradient(ellipse_at_bottom_right,rgba(59,130,246,.18),transparent_40%)]">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 md:px-10 py-5 sm:py-8 md:py-10 space-y-6 sm:space-y-8">
          {/* HEADER CARD (igual padrão Dashboard) */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-sm px-4 py-4 sm:px-6 sm:py-5 shadow-xl space-y-4">
            {/* Row 1: back + título + badge plano */}
            <img src="/logo-top-game-score.png" alt="Logo Top Game Score" className="w-48 h-auto rounded-lg" />
            <div className="flex items-center justify-between gap-3">
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => (window.history.length > 1 ? nav(-1) : nav('/dashboard'))}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 transition text-sm"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t('common.back')}
                </button>

                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-wide text-slate-400">
                    {t('host.heading')}
                  </span>
                  {/* <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-100 tracking-tight">
                    TopGameScore
                  </h1> */}
                  
                </div>
              </div>

              {/* Badge de plano */}
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                  isPro
                    ? 'bg-emerald-600/90 text-white'
                    : 'bg-slate-800 border border-slate-700 text-slate-100'
                }`}
                title={
                  isPro
                    ? t('create.limit.badge.pro', {
                        defaultValue: 'Plano Pro — perguntas ilimitadas',
                      })
                    : t('create.limit.badge.free', {
                        defaultValue: 'Plano Grátis — até 10 perguntas',
                      })
                }
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                {isPro
                  ? t('create.limit.badge.pro', { defaultValue: 'Pro ativo' })
                  : t('create.limit.badge.free', { defaultValue: 'Plano grátis' })}
              </span>
            </div>

            {/* Row 2: infos do grupo */}
            <div className="pt-2 border-t border-slate-800 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <div className="text-sm sm:text-base text-slate-100 font-semibold">
                  {(group as any)?.title || t('dashboard.group.defaultQuizTitle')}
                </div>
                <div className="text-xs text-slate-400 font-mono break-all">
                  ID: {groupId}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className={`px-2 py-0.5 rounded-full ${statusColor}`}>
                    {t(`host.status.${group?.status ?? 'draft'}`)}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-700/30 ring-1 ring-slate-700/60">
                    {t('host.questionsCount', { count: questions.length })}
                  </span>
                  {(group as any)?.locale && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-700/30 ring-1 ring-slate-700/60">
                      {t('host.locale', {
                        lng: ((group as any)?.locale?.toUpperCase?.() ?? 'EN'),
                      })}
                    </span>
                  )}
                </div>
              </div>

              {/* Aviso de expiração – somente plano FREE */}
              {!isPro && (group as any)?.expiresAt && (
                <p className="mt-1 text-xs text-amber-300/90 border border-amber-500/30 rounded-xl px-3 py-2 bg-amber-500/5 w-fit max-w-md">
                  ⚠️{' '}
                  {t('host.warningDays', {
                    count: getDaysLeft((group as any).expiresAt) ?? 0,
                  })}
                </p>
              )}
            </div>
          </div>

          {/* LAYOUT PRINCIPAL */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Coluna esquerda: Editor + Controles */}
            <div className="space-y-6">
              {/* Editor de perguntas */}
              <section className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm shadow-xl">
                <header className="px-4 py-3 border-b border-slate-800">
                  <h2 className="font-semibold text-slate-100">
                    {t('host.editor.title')}
                  </h2>
                </header>
                <div className="p-4">
                  <QuestionEditor groupId={groupId!} questions={questions} isPro={isPro} />
                </div>
              </section>

              {/* Controles */}
              <section className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm shadow-xl">
                <header className="px-4 py-3 border-b border-slate-800">
                  <h3 className="font-semibold text-slate-100">
                    {t('host.controls.title')}
                  </h3>
                </header>
                <div className="p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                    <button
                      onClick={openQuiz}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[.98] transition text-white font-medium"
                    >
                      <Play size={18} className="opacity-90" />
                      {t('host.controls.start')}
                    </button>
                    <button
                      onClick={finishQuiz}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-[.98] transition text-white font-medium"
                    >
                      <Flag size={18} className="opacity-90" />
                      {t('host.controls.finish')}
                    </button>
                  </div>

                  <div className="text-sm text-slate-300">
                    <div className="mb-1">{t('host.controls.linkLabel')}</div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <code className="flex-1 font-mono text-slate-200 bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 break-all">
                        {playerPath}
                      </code>
                      <button
                        onClick={copyLink}
                        className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition text-slate-200 text-sm"
                        title={t('host.controls.copy')}
                      >
                        {copied ? (
                          <>
                            <Check size={16} />
                            {t('common.copied')}
                          </>
                        ) : (
                          <>
                            <LinkIcon size={16} />
                            {t('host.controls.copy')}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Coluna direita: Leaderboard + info link */}
            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm shadow-xl p-4">
                <Leaderboard players={playersBoard} />
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm shadow-xl p-4 text-sm text-slate-300">
                {t('host.playersJoinAt')}{' '}
                <span className="font-mono text-slate-100 break-all">
                  {playerPath}
                </span>
              </section>
            </div>
          </div>
        </div>

        {/* Toast simples */}
        {toast.open && (
          <div
            className={`fixed bottom-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-sm ${
              toast.type === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-rose-600 text-white'
            }`}
          >
            {toast.message}
          </div>
        )}
      </div>
    </>
  );
}
