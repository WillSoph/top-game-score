import { useParams, useNavigate } from 'react-router-dom';
import { usePlayers } from '../hooks/usePlayers';
import { useQuestions } from '../hooks/useQuestions';
import { Trophy } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

export default function FinishedPage() {
  const { t, i18n } = useTranslation();
  const { groupId } = useParams();
  const nav = useNavigate();
  const players = usePlayers(groupId!);
  const questions = useQuestions(groupId!);

  const sortedPlayers = [...players].sort((a, b) => b.totalScore - a.totalScore);

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
    <div className="max-w-4xl mx-auto p-6 text-center text-white space-y-10">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-emerald-400 to-blue-400 text-transparent bg-clip-text">
          🏁 Final Results
        </h1>
        <p className="text-slate-400 text-sm">
          Thank you for playing! Here are the champions and correct answers:
        </p>
      </div>

      {/* Podium */}
      <div className="flex justify-center items-end gap-6">
        {/* 2nd */}
        {sortedPlayers[1] && (
          <div className="flex flex-col items-center">
            <div className="text-lg font-semibold text-slate-200">{sortedPlayers[1].name}</div>
            <div className="text-sm text-slate-400 mb-1">{sortedPlayers[1].totalScore} pts</div>
            <div className="w-24 h-36 bg-gradient-to-t from-gray-600 to-gray-300 rounded-t-lg shadow-md flex items-center justify-center">
              <Trophy className="text-gray-200 w-8 h-8" />
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-300">2nd</p>
          </div>
        )}

        {/* 1st */}
        {sortedPlayers[0] && (
          <div className="flex flex-col items-center">
            <div className="text-xl font-bold text-yellow-300">{sortedPlayers[0].name}</div>
            <div className="text-sm text-yellow-400 mb-1">{sortedPlayers[0].totalScore} pts</div>
            <div className="w-28 h-48 bg-gradient-to-t from-yellow-700 to-yellow-300 rounded-t-lg shadow-lg flex items-center justify-center">
              <Trophy className="text-yellow-100 w-10 h-10 drop-shadow-md" />
            </div>
            <p className="mt-2 text-lg font-bold text-yellow-300">1st</p>
          </div>
        )}

        {/* 3rd */}
        {sortedPlayers[2] && (
          <div className="flex flex-col items-center">
            <div className="text-lg font-semibold text-amber-500">{sortedPlayers[2].name}</div>
            <div className="text-sm text-amber-400 mb-1">{sortedPlayers[2].totalScore} pts</div>
            <div className="w-24 h-28 bg-gradient-to-t from-amber-900 to-amber-400 rounded-t-lg shadow-md flex items-center justify-center">
              <Trophy className="text-amber-100 w-8 h-8" />
            </div>
            <p className="mt-2 text-sm font-semibold text-amber-400">3rd</p>
          </div>
        )}
      </div>

      {/* Remaining Players */}
      {sortedPlayers.length > 3 && (
        <div className="mt-8 space-y-1 text-left max-w-md mx-auto">
          <h3 className="text-lg font-semibold text-slate-300 mb-2">Other Players</h3>
          <ol className="space-y-1">
            {sortedPlayers.slice(3).map((p, i) => (
              <li
                key={p.id}
                className="flex justify-between px-4 py-2 rounded bg-slate-800/70 backdrop-blur-sm border border-slate-700"
              >
                <span className="text-slate-200">{i + 4}. {p.name}</span>
                <span className="font-mono text-slate-400">{p.totalScore ?? 0}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Questions Review */}
      <div className="mt-12 text-left space-y-6">
        <h2 className="text-2xl font-semibold text-emerald-400">🧠 Quiz Review</h2>
        {questions.map((q, idx) => (
          <div
            key={q.id}
            className="p-4 rounded-lg bg-slate-800/60 border border-slate-700 shadow-sm hover:shadow-md transition"
          >
            <p className="font-medium text-white mb-2">
              {idx + 1}. {q.text}
            </p>
            <ul className="space-y-1">
              {q.options.map((opt: string, i: number) => (
                <li
                  key={i}
                  className={`px-3 py-2 rounded ${
                    i === q.correctIndex
                      ? 'bg-emerald-700 text-emerald-100 font-semibold border border-emerald-500'
                      : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  {opt}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Back Button */}
      <div className="pt-8">
        <button
          onClick={() => nav('/')}
          className="px-6 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-blue-500 hover:opacity-90 transition font-semibold text-white"
        >
          Return to Home
        </button>
      </div>
    </div>
  </>  
  );
}
