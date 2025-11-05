import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  Timestamp,
  writeBatch,
  setDoc,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';

type Lang = 'en' | 'pt' | 'es';

export default function CreateQuizPage() {
  const { t } = useTranslation();
  const nav = useNavigate();

  const [title, setTitle] = useState('Quiz');
  const [maxTimeSec, setMaxTimeSec] = useState(20);
  const [language, setLanguage] = useState<Lang>('en');

  const [text, setText] = useState('');
  const [opts, setOpts] = useState(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);

  const [questions, setQuestions] = useState<
    { text: string; options: string[]; correctIndex: number }[]
  >([]);

  useEffect(() => {
    if (!auth.currentUser) nav('/');
  }, [nav]);

  function addLocalQuestion() {
    if (!text.trim() || opts.some((o) => !o.trim())) {
      alert(t('create.validation.questionIncomplete'));
      return;
    }
    setQuestions((prev) => [...prev, { text: text.trim(), options: [...opts], correctIndex }]);
    setText('');
    setOpts(['', '', '', '']);
    setCorrectIndex(0);
  }

  function removeLocalQuestion(idx: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  }

  async function createGroup() {
    if (!auth.currentUser) {
      alert(t('create.toast.signInRequired'));
      return;
    }

    const hostUid = auth.currentUser.uid;
    const now = Timestamp.now();
    const expiresAt = Timestamp.fromMillis(now.toMillis() + 7 * 24 * 60 * 60 * 1000);

    const ref = await addDoc(collection(db, 'groups'), {
      hostUid,
      code: '',
      title: title || 'Quiz',
      createdAt: serverTimestamp(),
      expiresAt,
      status: 'draft',
      currentQuestionIndex: -1,
      questionCount: questions.length,
      roundStartedAt: null,
      maxTimeSec: Number(maxTimeSec) || 20,
      locale: language,
    });

    await setDoc(ref, { code: ref.id }, { merge: true });

    if (questions.length > 0) {
      const batch = writeBatch(db);
      questions.forEach((q, index) => {
        const qRef = doc(collection(db, 'groups', ref.id, 'questions'));
        batch.set(qRef, { ...q, index });
      });
      await batch.commit();
    }

    nav('/dashboard');
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,.20),transparent_40%),radial-gradient(ellipse_at_bottom_right,rgba(59,130,246,.18),transparent_40%)]">
      <div className="max-w-4xl mx-auto p-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => history.back()}
            className="text-sm text-slate-300 hover:text-white transition"
          >
            ← {t('common.back')}
          </button>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
          </div>
        </div>

        {/* Header */}
        <div className="mt-3 flex items-center justify-between">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
            {t('create.title')}
          </h1>
        </div>

        {/* Card principal */}
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm shadow-xl p-6 space-y-8">
          {/* Configurações básicas */}
          <section>
            <h2 className="text-slate-200 font-semibold mb-3">
              {t('create.setupTitle')}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="group">
                <label className="text-sm block mb-1 text-slate-300">{t('create.fields.title')}</label>
                <input
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('create.fields.titlePlaceholder')!}
                />
              </div>

              <div className="group">
                <label className="text-sm block mb-1 text-slate-300">
                  {t('create.fields.maxTime')}
                </label>
                <input
                  type="number"
                  min={5}
                  max={300}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  value={maxTimeSec}
                  onChange={(e) => setMaxTimeSec(Math.max(5, Math.min(300, Number(e.target.value) || 20)))}
                />
                <p className="text-xs text-slate-400 mt-1">{t('create.fields.maxTimeHint')}</p>
              </div>

              <div className="group">
                <label className="text-sm block mb-1 text-slate-300">{t('create.fields.language')}</label>
                <select
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Lang)}
                >
                  <option value="en">{t('create.lang.en')}</option>
                  <option value="pt">{t('create.lang.pt')}</option>
                  <option value="es">{t('create.lang.es')}</option>
                </select>
              </div>
            </div>
          </section>

          {/* Editor de perguntas */}
          <section>
            <h2 className="text-slate-200 font-semibold mb-3">{t('create.questions.title')}</h2>

            <div className="space-y-3">
              <input
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                placeholder={t('create.questions.placeholderQuestion')!}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />

              {opts.map((v, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                    placeholder={`${t('create.questions.option')} ${i + 1}`}
                    value={v}
                    onChange={(e) => {
                      const clone = [...opts];
                      clone[i] = e.target.value;
                      setOpts(clone);
                    }}
                  />
                  <label className="text-xs flex items-center gap-1 text-slate-300">
                    <input
                      type="radio"
                      className="accent-emerald-500"
                      checked={i === correctIndex}
                      onChange={() => setCorrectIndex(i)}
                    />
                    {t('create.questions.correct')}
                  </label>
                </div>
              ))}

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={addLocalQuestion}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition"
                >
                  {t('create.questions.add')}
                </button>
              </div>
            </div>

            {/* Lista local de perguntas */}
            {questions.length > 0 && (
              <ul className="mt-4 space-y-2">
                {questions.map((q, idx) => (
                  <li
                    key={idx}
                    className="p-3 rounded-xl border border-slate-800 bg-slate-900/70 hover:bg-slate-900 transition"
                  >
                    <div className="flex justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-100">
                          {idx + 1}. {q.text}
                        </div>
                        <ol className="text-sm mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                          {q.options.map((o, i) => (
                            <li
                              key={i}
                              className={`px-2 py-1 rounded ${
                                i === q.correctIndex
                                  ? 'text-emerald-300 bg-emerald-500/10 border border-emerald-500/30'
                                  : 'text-slate-300'
                              }`}
                            >
                              {o}
                            </li>
                          ))}
                        </ol>
                      </div>
                      <button
                        onClick={() => removeLocalQuestion(idx)}
                        className="text-rose-400 hover:text-rose-300 text-sm"
                      >
                        {t('create.questions.remove')}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={createGroup}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-semibold hover:opacity-90 active:opacity-100 transition"
            >
              {t('create.cta.createGroup')}
            </button>
            <p className="text-xs text-amber-300/90 border border-amber-500/30 rounded-xl px-3 py-2 bg-amber-500/5">
              ⚠️ {t('create.ttl')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
