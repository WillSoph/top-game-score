import { useParams, useNavigate } from 'react-router-dom';
import { useGroup } from '../hooks/useGroup';
import { useQuestions } from '../hooks/useQuestions';
import { usePlayers } from '../hooks/usePlayers';
import QuestionEditor from '../components/QuestionEditor';
import Leaderboard from '../components/Leaderboard';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Flag, Play, Link as LinkIcon, Check } from 'lucide-react';

export default function HostPage() {
  const { t, i18n } = useTranslation();
  const { groupId } = useParams();
  const nav = useNavigate();

  const group = useGroup(groupId!);
  const questions = useQuestions(groupId!);
  const playersBoard = usePlayers(groupId!);

  const [copied, setCopied] = useState(false);

  // Garante host logado (não anônimo)
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

  // Claim do hostUid se estiver ausente
  useEffect(() => {
    const u = auth.currentUser;
    if (!groupId || !group || !u || u.isAnonymous) return;
    const hostUid = (group as any)?.hostUid;
    if (!hostUid || hostUid === '') {
      updateDoc(doc(db, 'groups', groupId), { hostUid: u.uid }).catch((e) =>
        console.error('claim hostUid failed', e)
      );
    }
  }, [groupId, (group as any)?.hostUid]);

  function getDaysLeft(expiresAt?: any) {
    if (!expiresAt) return null;
    const exp = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt);
    const now = new Date();
    const diffMs = exp.getTime() - now.getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  }

  const daysLeft = getDaysLeft(group?.expiresAt) ?? 0;

  // Abre o quiz (status = open)
  async function openQuiz() {
    const u = requireHost();
    if (!u) return;
    const updates: any = { status: 'open', roundStartedAt: null };
    const hostUid = (group as any)?.hostUid;
    if (!hostUid || hostUid === '') updates.hostUid = u.uid;

    try {
      await updateDoc(doc(db, 'groups', groupId!), updates);
    } catch (e) {
      console.error('openQuiz error', e);
      alert(t('host.errors.open'));
    }
  }

  // Finaliza o quiz (status = finished)
  async function finishQuiz() {
    const u = requireHost();
    if (!u) return;
    try {
      await updateDoc(doc(db, 'groups', groupId!), { status: 'finished' });
      nav(`/finished/${groupId}`);
    } catch (e) {
      console.error('finishQuiz error', e);
      alert(t('host.errors.finish'));
    }
  }

  const playerPath = useMemo(() => `/play/${groupId}`, [groupId]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        `${import.meta.env.VITE_SITE_URL?.replace(/\/$/, '')}${playerPath}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // fallback: copia somente o path
      await navigator.clipboard.writeText(playerPath);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  }

  const statusColor =
    group?.status === 'open'
      ? 'bg-emerald-600/15 text-emerald-300 ring-1 ring-emerald-700/50'
      : group?.status === 'finished'
      ? 'bg-rose-600/15 text-rose-300 ring-1 ring-rose-700/50'
      : 'bg-slate-600/20 text-slate-300 ring-1 ring-slate-700/50';

  return (
    <>
      <Helmet>
        <title>{`${t('brand')} — ${t('seo.title')}`}</title>
        <meta name="description" content={t('seo.description')} />
        <link
          rel="canonical"
          href={`${import.meta.env.VITE_SITE_URL}/play/${groupId}`}
        />
        <meta name="robots" content="noindex,follow" />
      </Helmet>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Top bar */}
        <div className="flex items-start sm:items-center justify-between gap-4">
          <div>
            <button
              onClick={() => history.back()}
              className="text-sm text-slate-400 hover:text-slate-200"
            >
              ← {t('common.back')}
            </button>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">
              {t('host.heading')} • <span className="font-mono">{groupId}</span>
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className={`px-2 py-0.5 rounded-full ${statusColor}`}>
                {t(`host.status.${group?.status ?? 'draft'}`)}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-700/30 ring-1 ring-slate-700/60">
                {t('host.questionsCount', { count: questions.length })}
              </span>
              {(group as any)?.locale && (
                <span className="px-2 py-0.5 rounded-full bg-slate-700/30 ring-1 ring-slate-700/60">
                  {t('host.locale', { lng: ((group as any)?.locale?.toUpperCase?.() ?? 'EN') })}
                </span>
              )}
            </div>

            {group?.expiresAt && (
              <p className="mt-2 text-xs text-amber-300/90 border border-amber-500/30 rounded px-3 py-2 w-fit">
                ⚠️ {t('host.warningDays', { count: getDaysLeft(group.expiresAt) ?? 0 })}
              </p>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-6">
            {/* Questions Card */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/40 shadow-sm">
              <header className="px-4 py-3 border-b border-slate-800">
                <h2 className="font-semibold">{t('host.editor.title')}</h2>
              </header>
              <div className="p-4">
                <QuestionEditor groupId={groupId!} questions={questions} />
              </div>
            </section>

            {/* Controls Card */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/40 shadow-sm">
              <header className="px-4 py-3 border-b border-slate-800">
                <h3 className="font-semibold">{t('host.controls.title')}</h3>
              </header>
              <div className="p-4">
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={openQuiz}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[.99] transition"
                  >
                    <Play size={18} className="opacity-90" />
                    {t('host.controls.start')}
                  </button>
                  <button
                    onClick={finishQuiz}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-[.99] transition"
                  >
                    <Flag size={18} className="opacity-90" />
                    {t('host.controls.finish')}
                  </button>
                </div>

                <div className="mt-4 text-sm text-slate-300">
                  <div className="mb-1">{t('host.controls.linkLabel')}</div>
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-slate-200 bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5">
                      {playerPath}
                    </code>
                    <button
                      onClick={copyLink}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
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

          {/* Right column */}
          <div className="space-y-6">
            <Leaderboard players={playersBoard} />
            <section className="rounded-2xl border border-slate-800 bg-slate-900/40 shadow-sm p-4 text-sm">
              <div className="text-slate-300">
                {t('host.playersJoinAt')}{' '}
                <span className="font-mono">{playerPath}</span>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
