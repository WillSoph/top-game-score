// src/components/QuestionEditor.tsx
import { addDoc, collection, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, PlusCircle } from 'lucide-react';
import { FREE_QUESTION_LIMIT } from '../config/limits';

type QuestionEditorProps = {
  groupId: string;
  questions: any[];
  isPro: boolean;
};

export default function QuestionEditor({ groupId, questions, isPro }: QuestionEditorProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [opts, setOpts] = useState(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);

  const isFreeLimitReached = useMemo(
    () => !isPro && questions.length >= FREE_QUESTION_LIMIT,
    [isPro, questions.length]
  );

  async function add() {
    if (!text.trim() || opts.some((o) => !o.trim())) {
      alert(t('editor.validation.incomplete'));
      return;
    }

    // 🔒 BLOQUEIO PARA PLANO FREE
    if (isFreeLimitReached) {
      alert(
        t('editor.limit.freeReached', {
          limit: FREE_QUESTION_LIMIT,
        })
      );
      return;
    }

    const index = questions.length;
    await addDoc(collection(db, 'groups', groupId, 'questions'), {
      text,
      options: opts,
      correctIndex,
      index,
    });
    setText('');
    setOpts(['', '', '', '']);
    setCorrectIndex(0);
  }

  async function remove(id: string) {
    await deleteDoc(doc(db, 'groups', groupId, 'questions', id));
  }

  return (
    <div className="space-y-6 bg-slate-900/60 border border-slate-800 p-6 rounded-2xl shadow-lg backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-white">
          {t('editor.title')}
        </h3>
        <p className="text-sm text-slate-400">
          {t('editor.subtitle', { count: questions.length })}
        </p>
      </div>

      {/* Form */}
      <div className="space-y-3">
        <input
          className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
          placeholder={t('editor.placeholder.question')!}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        {opts.map((v, i) => (
          <div key={i} className="relative overflow-hidden rounded-lg">
            <input
              className="w-full px-3 py-2.5 pr-24 sm:pr-28 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              placeholder={`${t('create.questions.option')} ${i + 1}`}
              value={v}
              onChange={(e) => {
                const clone = [...opts];
                clone[i] = e.target.value;
                setOpts(clone);
              }}
            />

            <label
              className="absolute right-2 top-1/2 -translate-y-1/2
                         inline-flex items-center gap-2 px-2 py-1
                         bg-slate-900/70 backdrop-blur-sm
                         border border-slate-700 rounded-md
                         text-slate-300 text-xs sm:text-[13px] whitespace-nowrap
                         shadow-sm"
            >
              <input
                type="radio"
                className="accent-emerald-500 shrink-0"
                checked={i === correctIndex}
                onChange={() => setCorrectIndex(i)}
              />
              <span className="hidden sm:inline">
                {t('create.questions.correct')}
              </span>
            </label>
          </div>
        ))}

        <button
          onClick={add}
          disabled={isFreeLimitReached}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition
          ${
            isFreeLimitReached
              ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white'
          }`}
          title={
            isFreeLimitReached
              ? t('editor.limit.freeReached', { limit: FREE_QUESTION_LIMIT })
              : undefined
          }
        >
          <PlusCircle size={18} />
          {t('editor.addQuestion')}
        </button>
      </div>

      {/* Lista de perguntas existentes */}
      {questions.length > 0 && (
        <ul className="space-y-3 pt-3">
          {questions.map((q) => (
            <li
              key={q.id}
              className="p-4 rounded-xl border border-slate-800 bg-slate-900/70 hover:bg-slate-900 transition shadow-sm"
            >
              <div className="flex justify-between gap-4">
                <div>
                  <div className="font-medium text-slate-100 mb-2">
                    {q.index + 1}. {q.text}
                  </div>

                  <ol className="text-sm mt-1 list-decimal pl-5 space-y-1">
                    {q.options?.map((o: string, i: number) => (
                      <li
                        key={i}
                        className={`block px-2 py-1 rounded ${
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
                  onClick={() => remove(q.id)}
                  className="text-rose-400 hover:text-rose-300 transition"
                  title={t('editor.remove')}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
