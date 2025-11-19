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

  // se o host finalizar → mostra ranking
  useEffect(() => {
    if (group?.status === 'finished') setShowRanking(true);
  }, [group?.status]);

  // Se o usuário já estava cadastrado (reload)
  useEffect(() => {
    (async () => {
      await ensureAnonAuth();
      const uid = auth.currentUser?.uid;
      if (!uid || !groupId) return;

      const p = players.find((p) => p.id === uid);
      if (p && !joined) {
        setJoined(true);
        setMyQIndex(0);
        setRoundStart(Date.now());
        setHasAnswered(false);
        setTimeoutHandled(false);
      }
    })();
  }, [players, groupId, joined]);

  function onJoined() {
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
    if (!joined || !group || roundStart == null) {
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
        // marca que já tratou o timeout e envia resposta em branco
        setTimeoutHandled(true);
        handleTimeoutNoAnswer();
      }
    };

    // chama logo de cara
    tick();
    const id = window.setInterval(tick, 250);

    return () => clearInterval(id);
    // depende do início da rodada, do índice e do status básico
  }, [joined, group, roundStart, myQIndex, timeoutHandled, hasAnswered, groupId]);

  // ========= Envio normal de resposta =========
  async function submit(i: number) {
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
    if (!currentQuestion || !group) return;
    if (hasAnswered) return; // segurança extra

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

      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <button
          onClick={() => history.back()}
          className="text-sm text-slate-400"
        >
          ← {t('common.back')}
        </button>
        <h1 className="text-2xl font-bold">{t('play.title', 'Play')}</h1>

        {!joined ? (
          <PlayerJoin groupId={groupId!} onJoined={onJoined} />
        ) : showRanking ? (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="border-t border-slate-800 pt-4"
          >
            <h2 className="text-xl font-semibold mb-4 text-center">
              🏆 {t('play.finalRanking', 'Final Ranking')}
            </h2>
            <ul className="space-y-2">
              {sortedPlayers.map((p, idx) => (
                <li
                  key={p.id}
                  className={`flex justify-between px-4 py-2 rounded ${
                    idx === 0
                      ? 'bg-yellow-500 text-black font-bold'
                      : idx === 1
                      ? 'bg-gray-300 text-black font-semibold'
                      : idx === 2
                      ? 'bg-amber-700 text-white font-semibold'
                      : 'bg-slate-800 text-white'
                  }`}
                >
                  <span>
                    {idx + 1}. {p.name || 'Player'}
                  </span>
                  <span>{p.totalScore} pts</span>
                </li>
              ))}
            </ul>
          </motion.div>
        ) : group?.status !== 'open' ? (
          <div className="text-slate-400">
            {t(
              'play.waitingHost',
              'Waiting for the host to open the quiz…'
            )}
          </div>
        ) : (
          <div className="border-t border-slate-800 pt-4 overflow-hidden">
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
        )}
      </div>
    </>
  );
}
