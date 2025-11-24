import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGroup } from '../hooks/useGroup';
import { usePlayers } from '../hooks/usePlayers';
import { useQuestions } from '../hooks/useQuestions';
import PlayerJoin from '../components/PlayerJoin';
import LiveQuestion from '../components/LiveQuestion';
import { motion, AnimatePresence } from 'framer-motion';
import {
  doc,
  serverTimestamp,
  setDoc,
  getDoc,
  updateDoc,
  increment,
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { auth, db, ensureAnonAuth } from '../lib/firebase';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

export default function PlayPage() {
  const nav = useNavigate();
  const { t } = useTranslation();
  const { groupId } = useParams();

  const group = useGroup(groupId!);
  const players = usePlayers(groupId!);
  const questions = useQuestions(groupId!);

  const [joined, setJoined] = useState(false);
  const [answeredIndex, setAnsweredIndex] = useState<number | null>(null);
  const [myQIndex, setMyQIndex] = useState(0);
  const [roundStart, setRoundStart] = useState<number | null>(null);
  const [showRanking, setShowRanking] = useState(false);

  // controle para evitar múltiplos envios
  const [hasAnswered, setHasAnswered] = useState(false);
  const [timeoutHandled, setTimeoutHandled] = useState(false);
  const [timeLeftMs, setTimeLeftMs] = useState<number | null>(null);

  // novo: controle se o usuário já completou o quiz antes
  const [hasCompleted, setHasCompleted] = useState(false);

  // se o host finalizar → mostra ranking
  useEffect(() => {
    if (group?.status === 'finished') setShowRanking(true);
  }, [group?.status]);

  // Verifica se esse usuário já respondeu TODAS as questões desse quiz
  useEffect(() => {
    (async () => {
      if (!groupId) return;
      if (!questions.length) return; // espera carregar as perguntas

      await ensureAnonAuth();
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const answersSnap = await getDocs(
        query(
          collection(db, 'groups', groupId, 'answers'),
          where('playerId', '==', uid)
        )
      );

      const answeredIndexes = new Set<number>();
      answersSnap.forEach((docSnap) => {
        const data = docSnap.data() as any;
        if (typeof data.qIndex === 'number') {
          answeredIndexes.add(data.qIndex);
        }
      });

      if (answeredIndexes.size >= questions.length) {
        // Já respondeu todas as questões → não pode jogar de novo
        setHasCompleted(true);
        setJoined(true);
        setShowRanking(true);
        setHasAnswered(true);
        setTimeoutHandled(true);
      } else {
        setHasCompleted(false);
      }
    })();
  }, [groupId, questions.length]);

  // Se o usuário já estava cadastrado (reload)
  useEffect(() => {
    (async () => {
      await ensureAnonAuth();
      const uid = auth.currentUser?.uid;
      if (!uid || !groupId) return;

      const p = players.find((p) => p.id === uid);
      if (p && !joined && !hasCompleted) {
        // se já completou, não reinicializa fluxo
        setJoined(true);
        setMyQIndex(0);
        setRoundStart(Date.now());
        setHasAnswered(false);
        setTimeoutHandled(false);
      }
    })();
  }, [players, groupId, joined, hasCompleted]);

  function onJoined() {
    // se já completou o quiz, não deixa entrar no fluxo de perguntas
    if (hasCompleted) {
      setJoined(true);
      setShowRanking(true);
      return;
    }

    setJoined(true);
    setMyQIndex(0);
    setRoundStart(Date.now());
    setHasAnswered(false);
    setTimeoutHandled(false);
  }

  const currentQuestion = useMemo(
    () => questions[myQIndex] ?? null,
    [questions, myQIndex]
  );

  // ========= TIMER: atualiza timeLeftMs e dispara timeout =========
  useEffect(() => {
    if (!joined || !group || roundStart == null || hasCompleted) {
      setTimeLeftMs(null);
      return;
    }

    const maxMs = ((group as any)?.maxTimeSec ?? 20) * 1000;

    const tick = () => {
      const elapsed = Date.now() - roundStart;
      const remaining = maxMs - elapsed;
      const clamped = remaining > 0 ? remaining : 0;
      setTimeLeftMs(clamped);

      if (
        clamped <= 0 &&
        !timeoutHandled &&
        !hasAnswered &&
        group?.status === 'open'
      ) {
        setTimeoutHandled(true);
        handleTimeoutNoAnswer();
      }
    };

    tick();
    const id = window.setInterval(tick, 250);
    return () => clearInterval(id);
  }, [
    joined,
    group,
    roundStart,
    myQIndex,
    timeoutHandled,
    hasAnswered,
    groupId,
    hasCompleted,
  ]);

  // ========= Envio normal de resposta =========
  async function submit(i: number) {
    // segurança extra: se já completou, não envia mais nada
    if (hasCompleted) return;
    if (!currentQuestion || !group || hasAnswered) return;

    try {
      await ensureAnonAuth();
      const uid = auth.currentUser!.uid;

      setAnsweredIndex(i);
      setHasAnswered(true);

      const gSnap = await getDoc(doc(db, 'groups', groupId!));
      const g = gSnap.data() as any;
      if (g?.status !== 'open') {
        setAnsweredIndex(null);
        setHasAnswered(false);
        alert('Quiz is closed.');
        return;
      }

      const startMs = roundStart ?? Date.now();
      const elapsedMs = Math.max(0, Date.now() - startMs);
      const maxMs = (g?.maxTimeSec ?? 20) * 1000;

      const correct = i === currentQuestion.correctIndex;
      const base = 500;
      const bonus = correct
        ? Math.max(0, Math.round(500 * (1 - elapsedMs / maxMs)))
        : 0;
      const scoreAwarded = correct ? base + bonus : 0;

      const qIndex = Number(myQIndex);
      const answerId = `${uid}_${qIndex}`;

      await setDoc(
        doc(db, 'groups', groupId!, 'answers', answerId),
        {
          playerId: uid,
          qIndex,
          chosenIndex: i,
          correct,
          elapsedMs,
          scoreAwarded,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

      if (scoreAwarded > 0) {
        await updateDoc(doc(db, 'groups', groupId!, 'players', uid), {
          totalScore: increment(scoreAwarded),
        });
      }

      handleNextQuestion();
    } catch (e: any) {
      console.error('submit error', e);
      alert(`Failed to submit answer: ${e?.code || 'unknown'}`);
      setAnsweredIndex(null);
      setHasAnswered(false);
    }
  }

  // ========= Timeout: resposta vazia, 0 pontos =========
  async function handleTimeoutNoAnswer() {
    if (hasCompleted) return;
    if (!currentQuestion || !group) return;
    if (hasAnswered) return;

    try {
      await ensureAnonAuth();
      const uid = auth.currentUser!.uid;
      const qIndex = Number(myQIndex);
      const answerId = `${uid}_${qIndex}`;

      await setDoc(
        doc(db, 'groups', groupId!, 'answers', answerId),
        {
          playerId: uid,
          qIndex,
          chosenIndex: null,
          correct: false,
          elapsedMs: null,
          scoreAwarded: 0,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

      setHasAnswered(true);
      handleNextQuestion();
    } catch (e) {
      console.error('timeout answer error', e);
    }
  }

  // ========= Avançar para próxima pergunta ou ranking =========
  function handleNextQuestion() {
    const next = myQIndex + 1;

    if (next < questions.length) {
      setTimeout(() => {
        setMyQIndex(next);
        setRoundStart(Date.now());
        setAnsweredIndex(null);
        setHasAnswered(false);
        setTimeoutHandled(false);
        setTimeLeftMs(null);
      }, 400);
    } else {
      setShowRanking(true);
      setHasCompleted(true);
    }
  }

  // Ranking final
  const sortedPlayers = [...players].sort(
    (a, b) => b.totalScore - a.totalScore
  );

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

      <main className="min-h-screen bg-slate-950 text-slate-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* TOPO COM LOGO + VOLTAR */}
          <header className="mb-8 flex items-center justify-between gap-4">
            <button
              onClick={() => history.back()}
              className="text-sm font-medium text-slate-300 hover:text-cyan-300 transition-colors inline-flex items-center gap-1"
            >
              <span className="text-cyan-400">←</span> {t('common.back')}
            </button>

            <div className="flex-1 flex justify-center">
              <img
                src="/logo-top-game-score.png"
                alt="Logo Top Game Score"
                className="w-48 h-auto rounded-lg"
              />
            </div>

            <div className="w-24" /> {/* espaçador para alinhar com o botão */}
          </header>

          {/* TÍTULO */}
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-violet-500 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]">
              {t('play.title')}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              {joined
                ? t('play.subtitlePlaying', 'Responda rápido e suba no ranking!')
                : t(
                    'play.subtitleJoin',
                    'Entre com seu nome e identifique-se para começar.'
                  )}
            </p>

            {/* Linha neon fininha */}
            <div className="mt-4 h-px w-40 mx-auto bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-70" />
          </div>

          {/* CONTEÚDO PRINCIPAL */}
          {!joined ? (
            // CARD DE ENTRAR
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="relative rounded-2xl border border-cyan-500/40 bg-slate-900/70 px-6 py-6 shadow-[0_0_40px_rgba(8,253,216,0.25)] overflow-hidden"
            >
              {/* glow de fundo */}
              <div className="pointer-events-none absolute inset-0 opacity-60 mix-blend-screen">
                <div className="absolute -top-24 -left-10 w-64 h-64 rounded-full bg-cyan-500/20 blur-3xl" />
                <div className="absolute -bottom-20 -right-10 w-72 h-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
              </div>

              <div className="relative z-10">
                <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/80">
                  <span className="h-px w-8 bg-cyan-400/60" />
                  {t('play.joinLabel', 'Lobby do Quiz')}
                </div>

                <PlayerJoin groupId={groupId!} onJoined={onJoined} />
              </div>
            </motion.div>
          ) : showRanking ? (
            // CARD DO RANKING
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="relative rounded-2xl border border-emerald-400/40 bg-slate-900/70 px-6 py-6 shadow-[0_0_40px_rgba(45,212,191,0.35)] overflow-hidden"
            >
              <div className="pointer-events-none absolute inset-0 opacity-60 mix-blend-screen">
                <div className="absolute -top-24 -right-10 w-64 h-64 rounded-full bg-emerald-400/25 blur-3xl" />
              </div>

              <div className="relative z-10">
                <h2 className="text-xl font-semibold mb-4 text-center flex items-center justify-center gap-2">
                  <span className="text-2xl">🏆</span>
                  <span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
                    Final Ranking
                  </span>
                </h2>
                <ul className="space-y-2">
                  {sortedPlayers.map((p, idx) => (
                    <li
                      key={p.id}
                      className={`flex justify-between items-center px-4 py-2 rounded-xl border text-sm ${
                        idx === 0
                          ? 'bg-yellow-400 text-black font-bold border-yellow-200 shadow-[0_0_25px_rgba(250,204,21,0.8)]'
                          : idx === 1
                          ? 'bg-slate-100 text-black font-semibold border-slate-300'
                          : idx === 2
                          ? 'bg-amber-700 text-amber-50 font-semibold border-amber-500/70'
                          : 'bg-slate-900/80 text-slate-50 border-slate-700/70'
                      }`}
                    >
                      <span>
                        {idx + 1}. {p.name || 'Player'}
                      </span>
                      <span className="font-semibold">{p.totalScore} pts</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ) : group?.status !== 'open' ? (
            // CARD DE ESPERA
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-violet-500/40 bg-slate-900/70 px-6 py-6 shadow-[0_0_35px_rgba(167,139,250,0.4)] text-center"
            >
              <p className="text-slate-300">
                {t(
                  'play.waiting',
                  'Aguardando o host abrir o quiz…'
                )}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {t(
                  'play.waitingHint',
                  'Fique de olho, você será jogado direto para a pergunta assim que começar.'
                )}
              </p>
            </motion.div>
          ) : (
            // CARD DA PERGUNTA AO VIVO
            <div className="relative rounded-2xl border border-fuchsia-500/40 bg-slate-900/70 px-6 py-6 shadow-[0_0_45px_rgba(244,114,182,0.4)] overflow-hidden">
              <div className="pointer-events-none absolute inset-0 opacity-60 mix-blend-screen">
                <div className="absolute -top-24 left-0 w-64 h-64 rounded-full bg-fuchsia-500/25 blur-3xl" />
                <div className="absolute -bottom-24 right-0 w-64 h-64 rounded-full bg-cyan-500/25 blur-3xl" />
              </div>

              <div className="relative z-10 border border-fuchsia-400/40 rounded-xl p-4 bg-slate-950/70 backdrop-blur-sm">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={myQIndex}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.4 }}
                  >
                    <LiveQuestion
                      q={currentQuestion}
                      onChoose={submit}
                      onTimeout={handleTimeoutNoAnswer}
                      roundStartedAt={{
                        toMillis: () => roundStart ?? Date.now(),
                      }}
                      maxTimeSec={(group as any)?.maxTimeSec ?? 20}
                      answeredIndex={answeredIndex}
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
