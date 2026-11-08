import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  Timestamp,
  writeBatch,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useTranslation } from "react-i18next";
import { useUserPlan } from "../hooks/useUserPlan";

type Lang = "en" | "pt" | "es";
type CreationMode = "manual" | "ai";
type Difficulty = "easy" | "medium" | "hard";

type QuizQuestion = {
  text: string;
  options: string[];
  correctIndex: number;
};

type GeneratedQuiz = {
  title: string;
  questions: QuizQuestion[];
};

type AiUsage = {
  used: number;
  limit: number;
  month: string;
};

const FREE_QUESTION_LIMIT = 10;
const MAX_QUESTION_LIMIT = 30;
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 5;

const ui = {
  pt: {
    choose: "Como deseja criar seu quiz?",
    manual: "Criar manualmente",
    manualDesc: "Escreva suas perguntas, alternativas e respostas corretas.",
    ai: "Gerar com IA",
    aiDesc: "Descreva um tema de videogames e deixe a IA criar as perguntas.",
    allPlans: "Free e Pro",
    proOnly: "Exclusivo Pro",
    backModes: "Alterar modo de criação",
    upgrade: "Assine o Pro para utilizar a geração com IA.",
    aiTitle: "Configure seu quiz com IA",
    topic: "Tema sobre videogames",
    topicPlaceholder: "Ex.: História da franquia Resident Evil",
    count: "Quantidade de perguntas",
    alternatives: "Alternativas por pergunta",
    difficulty: "Dificuldade",
    easy: "Fácil",
    medium: "Média",
    hard: "Difícil",
    quota: "30 gerações válidas por mês no Pro",
    quotaNote:
      "Cada geração válida consome uma cota, mesmo se o quiz for descartado.",
    manualCounter: "perguntas adicionadas",
    remaining: "restantes",
    generating: "Gerando perguntas...",
    saving: "Salvando...",
    save: "Salvar quiz",
    discard: "Descartar quiz",
    generated:
      "Geração concluída. Uma cota foi consumida, mesmo que você descarte o resultado.",
    used: "Gerações utilizadas",
    invalidTopic: "Informe um tema com 3 a 300 caracteres.",
    invalidResponse: "O servidor retornou um quiz inválido.",
    generationError: "Não foi possível gerar o quiz.",
    saveError: "Não foi possível salvar o quiz.",
    missingGroupId: "O servidor não retornou o identificador do quiz.",
    addOption: "+ Adicionar alternativa",
    removeOption: "− Remover alternativa",
    optionCount: "alternativas",
    questionRequired: "Adicione pelo menos uma pergunta antes de criar o quiz.",
    invalidQuestion: "Existem perguntas ou alternativas inválidas.",
    invalidOptions: "Cada pergunta deve ter entre 2 e 5 alternativas.",
    invalidCorrect: "Selecione uma alternativa correta.",
  },
  en: {
    choose: "How would you like to create your quiz?",
    manual: "Create manually",
    manualDesc: "Write questions, answers and choose the correct option.",
    ai: "Generate with AI",
    aiDesc: "Describe a video game topic and let AI prepare the questions.",
    allPlans: "Free and Pro",
    proOnly: "Pro only",
    backModes: "Change creation mode",
    upgrade: "Upgrade to Pro to generate quizzes with AI.",
    aiTitle: "Configure your AI quiz",
    topic: "Video game topic",
    topicPlaceholder: "E.g. History of the Resident Evil series",
    count: "Number of questions",
    alternatives: "Options per question",
    difficulty: "Difficulty",
    easy: "Easy",
    medium: "Medium",
    hard: "Hard",
    quota: "30 valid generations per month on Pro",
    quotaNote:
      "Every valid generation uses one credit, even if you discard the quiz.",
    manualCounter: "questions added",
    remaining: "remaining",
    generating: "Generating questions...",
    saving: "Saving...",
    save: "Save quiz",
    discard: "Discard quiz",
    generated:
      "Generation completed. One credit was used even if you discard the result.",
    used: "Generations used",
    invalidTopic: "Enter a topic between 3 and 300 characters.",
    invalidResponse: "The server returned an invalid quiz.",
    generationError: "Could not generate the quiz.",
    saveError: "Could not save the quiz.",
    missingGroupId: "The server did not return the quiz identifier.",
    addOption: "+ Add option",
    removeOption: "− Remove option",
    optionCount: "options",
    questionRequired: "Add at least one question before creating the quiz.",
    invalidQuestion: "Some questions or options are invalid.",
    invalidOptions: "Each question must have between 2 and 5 options.",
    invalidCorrect: "Select a correct answer.",
  },
  es: {
    choose: "¿Cómo quieres crear tu quiz?",
    manual: "Crear manualmente",
    manualDesc: "Escribe preguntas, alternativas y respuestas correctas.",
    ai: "Generar con IA",
    aiDesc:
      "Describe un tema de videojuegos y deja que la IA cree las preguntas.",
    allPlans: "Gratis y Pro",
    proOnly: "Solo Pro",
    backModes: "Cambiar modo de creación",
    upgrade: "Contrata Pro para generar quizzes con IA.",
    aiTitle: "Configura tu quiz con IA",
    topic: "Tema de videojuegos",
    topicPlaceholder: "Ej.: Historia de Resident Evil",
    count: "Cantidad de preguntas",
    alternatives: "Alternativas por pregunta",
    difficulty: "Dificultad",
    easy: "Fácil",
    medium: "Media",
    hard: "Difícil",
    quota: "30 generaciones válidas al mes en Pro",
    quotaNote:
      "Cada generación válida consume un crédito, incluso si descartas el quiz.",
    manualCounter: "preguntas añadidas",
    remaining: "restantes",
    generating: "Generando preguntas...",
    saving: "Guardando...",
    save: "Guardar quiz",
    discard: "Descartar quiz",
    generated:
      "Generación completada. Se consumió un crédito aunque descartes el resultado.",
    used: "Generaciones utilizadas",
    invalidTopic: "Introduce un tema de 3 a 300 caracteres.",
    invalidResponse: "El servidor devolvió un quiz inválido.",
    generationError: "No se pudo generar el quiz.",
    saveError: "No se pudo guardar el quiz.",
    missingGroupId: "El servidor no devolvió el identificador del quiz.",
    addOption: "+ Añadir alternativa",
    removeOption: "− Quitar alternativa",
    optionCount: "alternativas",
    questionRequired: "Añade al menos una pregunta antes de crear el quiz.",
    invalidQuestion: "Hay preguntas o alternativas inválidas.",
    invalidOptions: "Cada pregunta debe tener entre 2 y 5 alternativas.",
    invalidCorrect: "Selecciona una respuesta correcta.",
  },
} as const;

export default function CreateQuizPage() {
  const { t, i18n } = useTranslation();
  const nav = useNavigate();

  const detectedLang = (i18n.resolvedLanguage || i18n.language || "en").split(
    "-",
  )[0];

  const lang: Lang =
    detectedLang === "pt" || detectedLang === "es" || detectedLang === "en"
      ? detectedLang
      : "en";

  const labels = ui[lang];

  const { plan, active } = useUserPlan();
  const isPro = plan === "pro" && active;
  const limit = isPro ? MAX_QUESTION_LIMIT : FREE_QUESTION_LIMIT;

  const [mode, setMode] = useState<CreationMode | null>(null);

  // Configurações da geração com IA
  const [aiTopic, setAiTopic] = useState("");
  const [aiQuestionCount, setAiQuestionCount] = useState(10);
  const [aiOptionCount, setAiOptionCount] = useState(4);
  const [aiDifficulty, setAiDifficulty] = useState<Difficulty>("medium");

  const [aiLoading, setAiLoading] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiPreview, setAiPreview] = useState<GeneratedQuiz | null>(null);
  const [aiUsage, setAiUsage] = useState<AiUsage | null>(null);
  const [aiRequestId, setAiRequestId] = useState<string | null>(null);

  // Configurações gerais
  const [title, setTitle] = useState("Quiz");
  const [maxTimeSec, setMaxTimeSec] = useState(20);
  const [language, setLanguage] = useState<Lang>("en");

  // Editor manual
  const [text, setText] = useState("");
  const [opts, setOpts] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [manualSaving, setManualSaving] = useState(false);

  const qCount = questions.length;

  const remaining = useMemo(() => Math.max(0, limit - qCount), [limit, qCount]);

  useEffect(() => {
    if (!auth.currentUser) {
      nav("/");
    }
  }, [nav]);

  // ============================================================
  // GERAÇÃO COM IA
  // ============================================================

  async function generateAiQuiz() {
    if (aiLoading || aiSaving || !isPro || aiPreview) return;

    const topic = aiTopic.trim();

    if (topic.length < 3 || topic.length > 300) {
      setAiError(labels.invalidTopic);
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      setAiError(t("create.toast.signInRequired"));
      return;
    }

    setAiLoading(true);
    setAiError("");

    // Reutiliza o identificador em tentativas após falhas de rede.
    const requestId =
      aiRequestId ||
      `quiz_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;

    setAiRequestId(requestId);

    try {
      const token = await user.getIdToken();

      const response = await fetch("/.netlify/functions/generate-ai-quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requestId,
          topic,
          questionCount: aiQuestionCount,
          optionsPerQuestion: aiOptionCount,
          difficulty: aiDifficulty,
          language,
        }),
      });

      const data: unknown = await response.json();

      if (!data || typeof data !== "object") {
        throw new Error(labels.invalidResponse);
      }

      const result = data as {
        error?: string;
        quiz?: GeneratedQuiz;
        usage?: AiUsage;
      };

      if (!response.ok) {
        if ([400, 403, 422, 429].includes(response.status)) {
          setAiRequestId(null);
        }

        throw new Error(result.error || `Erro HTTP ${response.status}`);
      }

      const quiz = result.quiz;

      if (
        !quiz ||
        typeof quiz.title !== "string" ||
        !quiz.title.trim() ||
        !Array.isArray(quiz.questions) ||
        quiz.questions.length !== aiQuestionCount ||
        quiz.questions.some(
          (q) =>
            !q ||
            typeof q.text !== "string" ||
            !q.text.trim() ||
            !Array.isArray(q.options) ||
            q.options.length !== aiOptionCount ||
            q.options.some(
              (option) => typeof option !== "string" || !option.trim(),
            ) ||
            !Number.isInteger(q.correctIndex) ||
            q.correctIndex < 0 ||
            q.correctIndex >= q.options.length,
        )
      ) {
        throw new Error(labels.invalidResponse);
      }

      setAiPreview(quiz);

      if (result.usage) {
        setAiUsage(result.usage);
      }
    } catch (error) {
      setAiError(
        error instanceof Error ? error.message : labels.generationError,
      );
    } finally {
      setAiLoading(false);
    }
  }

  // ============================================================
  // SALVAR QUIZ GERADO COM IA
  // ============================================================

  async function saveAiQuiz() {
    if (!aiPreview || !aiRequestId || aiSaving || aiLoading || !isPro) {
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      setAiError(t("create.toast.signInRequired"));
      return;
    }

    setAiSaving(true);
    setAiError("");

    try {
      const token = await user.getIdToken();

      const response = await fetch("/.netlify/functions/save-ai-quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          generationId: aiRequestId,
          maxTimeSec,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        groupId?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || `Erro HTTP ${response.status}`);
      }

      if (!data.groupId) {
        throw new Error(labels.missingGroupId);
      }

      // NOVO:
      // Após salvar o quiz com IA, abre seu gerenciamento.
      nav(`/host/${data.groupId}`, { replace: true });
    } catch (error) {
      setAiError(error instanceof Error ? error.message : labels.saveError);
    } finally {
      setAiSaving(false);
    }
  }

  function discardAiQuiz() {
    if (!aiPreview || aiLoading || aiSaving) return;

    setAiPreview(null);
    setAiRequestId(null);
    setAiError("");
  }

  // ============================================================
  // EDITOR MANUAL
  // ============================================================

  function addLocalQuestion() {
    const cleanText = text.trim();
    const cleanOptions = opts.map((option) => option.trim());

    if (!cleanText || cleanOptions.some((option) => !option)) {
      alert(t("create.validation.questionIncomplete"));
      return;
    }

    if (
      cleanOptions.length < MIN_OPTIONS ||
      cleanOptions.length > MAX_OPTIONS
    ) {
      alert(labels.invalidOptions);
      return;
    }

    if (correctIndex < 0 || correctIndex >= cleanOptions.length) {
      alert(labels.invalidCorrect);
      return;
    }

    if (qCount >= limit) {
      alert(
        `Você atingiu o limite de ${limit} perguntas por quiz para seu plano.`,
      );
      return;
    }

    setQuestions((prev) => [
      ...prev,
      {
        text: cleanText,
        options: cleanOptions,
        correctIndex,
      },
    ]);

    setText("");
    setOpts(["", "", "", ""]);
    setCorrectIndex(0);
  }

  function removeLocalQuestion(idx: number) {
    setQuestions((prev) => prev.filter((_, index) => index !== idx));
  }

  function addOption() {
    if (opts.length >= MAX_OPTIONS) return;

    setOpts((prev) => [...prev, ""]);
  }

  function removeOption() {
    if (opts.length <= MIN_OPTIONS) return;

    setOpts((prev) => prev.slice(0, -1));

    if (correctIndex >= opts.length - 1) {
      setCorrectIndex(0);
    }
  }

  // ============================================================
  // CRIAÇÃO MANUAL DO GRUPO
  // ============================================================

  async function createGroup() {
    if (manualSaving) return;

    const user = auth.currentUser;

    if (!user) {
      alert(t("create.toast.signInRequired"));
      return;
    }

    if (mode !== "manual") return;

    if (qCount === 0) {
      alert(labels.questionRequired);
      return;
    }

    if (qCount > limit) {
      alert(`O limite do seu plano é de ${limit} perguntas por quiz.`);
      return;
    }

    const invalidQuestion = questions.some(
      (question) =>
        !question.text.trim() ||
        question.options.length < MIN_OPTIONS ||
        question.options.length > MAX_OPTIONS ||
        question.options.some((option) => !option.trim()) ||
        !Number.isInteger(question.correctIndex) ||
        question.correctIndex < 0 ||
        question.correctIndex >= question.options.length,
    );

    if (invalidQuestion) {
      alert(labels.invalidQuestion);
      return;
    }

    setManualSaving(true);

    try {
      const hostUid = user.uid;
      const now = Timestamp.now();

      const hostEmail = user.email ?? null;
      const hostName =
        user.displayName || (hostEmail ? hostEmail.split("@")[0] : null);

      const expiresAt = isPro
        ? null
        : Timestamp.fromMillis(now.toMillis() + 7 * 24 * 60 * 60 * 1000);

      // Cria o grupo manual no Firestore.
      const ref = await addDoc(collection(db, "groups"), {
        hostUid,
        hostName,
        hostEmail,
        code: "",
        title: title.trim() || "Quiz",
        createdAt: serverTimestamp(),
        expiresAt,
        status: "draft",
        currentQuestionIndex: -1,
        questionCount: qCount,
        roundStartedAt: null,
        maxTimeSec: Number(maxTimeSec) || 20,
        locale: language,
        plan: isPro ? "pro" : "free",
        creationMethod: "manual",
      });

      // Atualiza o código para o ID do grupo.
      await setDoc(ref, { code: ref.id }, { merge: true });

      // Salva todas as perguntas.
      const batch = writeBatch(db);

      questions.forEach((question, index) => {
        const questionRef = doc(collection(db, "groups", ref.id, "questions"));

        batch.set(questionRef, {
          ...question,
          index,
        });
      });

      await batch.commit();

      // NOVO:
      // Após salvar o quiz manual, abre seu gerenciamento.
      nav(`/host/${ref.id}`, { replace: true });
    } catch (error: unknown) {
      console.error("Erro ao criar grupo:", error);

      alert(
        `Erro ao criar grupo: ${
          error instanceof Error
            ? error.message
            : "verifique o console do navegador para mais detalhes."
        }`,
      );
    } finally {
      setManualSaving(false);
    }
  }

  // ============================================================
  // INTERFACE
  // ============================================================

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,.20),transparent_40%),radial-gradient(ellipse_at_bottom_right,rgba(59,130,246,.18),transparent_40%)]">
      <div className="mx-auto max-w-4xl p-4 sm:p-6">
        {/* TOP BAR */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => nav("/dashboard")}
            className="w-fit text-sm text-slate-300 hover:text-white transition"
          >
            ← {t("common.back")}
          </button>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                isPro
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-800 border border-slate-700 text-slate-200"
              }`}
              title={
                isPro
                  ? t("create.limit.badge.pro", {
                      defaultValue: "Pro — up to {{limit}} questions",
                      limit,
                    })
                  : t("create.limit.badge.free", {
                      defaultValue: "Free — up to {{limit}} questions",
                      limit,
                    })
              }
            >
              {isPro
                ? t("create.limit.badge.pro", {
                    defaultValue: "Pro",
                  })
                : t("create.limit.badge.free", {
                    defaultValue: "Free",
                  })}
            </span>

            {!isPro && (
              <button
                type="button"
                onClick={() => nav("/")}
                className="px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-blue-500 text-white text-sm font-semibold hover:opacity-90 transition"
              >
                {t("create.limit.upgradeCta", {
                  defaultValue: "Upgrade",
                })}
              </button>
            )}

            <LanguageSwitcher />
          </div>
        </div>

        {/* HEADER */}
        <div className="mt-2 sm:mt-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
            {t("create.title")}
          </h1>

          {mode === "manual" && (
            <p className="mt-2 text-sm text-slate-300">
              {qCount} / {limit} {labels.manualCounter}
              <span className="ml-2 text-emerald-400">
                ({remaining} {labels.remaining})
              </span>
            </p>
          )}
        </div>

        {/* SELEÇÃO DO MODO */}
        {mode === null ? (
          <section className="mt-6 space-y-4">
            <h2 className="text-xl font-bold text-white">{labels.choose}</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* MANUAL */}
              <button
                type="button"
                onClick={() => setMode("manual")}
                className="group rounded-2xl border border-slate-700 bg-slate-900/70 p-6 text-left transition hover:border-blue-400 hover:bg-slate-800/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/15 text-2xl text-blue-300">
                  ✎
                </div>

                <h3 className="text-lg font-bold text-white">
                  {labels.manual}
                </h3>

                <p className="mt-2 min-h-[3rem] text-sm text-slate-400">
                  {labels.manualDesc}
                </p>

                <span className="mt-4 inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  {labels.allPlans}
                </span>
              </button>

              {/* IA */}
              <button
                type="button"
                onClick={() => setMode("ai")}
                className="group rounded-2xl border border-emerald-500/30 bg-slate-900/70 p-6 text-left transition hover:border-emerald-400 hover:bg-slate-800/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-2xl text-emerald-300">
                  ✦
                </div>

                <h3 className="text-lg font-bold text-white">{labels.ai}</h3>

                <p className="mt-2 min-h-[3rem] text-sm text-slate-400">
                  {labels.aiDesc}
                </p>

                <span className="mt-4 inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                  {labels.proOnly}
                </span>
              </button>
            </div>
          </section>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setMode(null)}
              className="mt-5 text-sm text-cyan-300 hover:text-cyan-200"
            >
              ← {labels.backModes}
            </button>

            {mode === "ai" ? (
              // ==================================================
              // FORMULÁRIO DE IA
              // ==================================================

              <section className="mt-4 space-y-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-xl sm:p-6">
                <h2 className="text-xl font-bold text-white">
                  {labels.aiTitle}
                </h2>

                {!isPro && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
                    <p>{labels.upgrade}</p>

                    <button
                      type="button"
                      onClick={() => nav("/")}
                      className="mt-3 rounded-lg bg-gradient-to-r from-emerald-500 to-blue-500 px-4 py-2 font-semibold text-white"
                    >
                      {t("create.limit.upgradeCta", {
                        defaultValue: "Upgrade",
                      })}
                    </button>
                  </div>
                )}

                {/* TEMA */}
                <div className="space-y-2">
                  <label
                    htmlFor="ai-topic"
                    className="block text-sm font-medium text-slate-300"
                  >
                    {labels.topic}
                  </label>

                  <textarea
                    id="ai-topic"
                    value={aiTopic}
                    onChange={(e) => {
                      setAiTopic(e.target.value);
                      setAiRequestId(null);
                    }}
                    disabled={!isPro || !!aiPreview || aiLoading}
                    maxLength={300}
                    rows={3}
                    placeholder={labels.topicPlaceholder}
                    className="w-full resize-y rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                  />
                </div>

                {/* PERGUNTAS / ALTERNATIVAS / DIFICULDADE */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="space-y-2 text-sm text-slate-300">
                    <span className="block">{labels.count}</span>

                    <select
                      value={aiQuestionCount}
                      onChange={(e) => {
                        setAiQuestionCount(Number(e.target.value));
                        setAiRequestId(null);
                      }}
                      disabled={!isPro || !!aiPreview || aiLoading}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white disabled:opacity-50"
                    >
                      {Array.from(
                        { length: MAX_QUESTION_LIMIT },
                        (_, i) => i + 1,
                      ).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2 text-sm text-slate-300">
                    <span className="block">{labels.alternatives}</span>

                    <select
                      value={aiOptionCount}
                      onChange={(e) => {
                        setAiOptionCount(Number(e.target.value));
                        setAiRequestId(null);
                      }}
                      disabled={!isPro || !!aiPreview || aiLoading}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white disabled:opacity-50"
                    >
                      {[2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2 text-sm text-slate-300">
                    <span className="block">{labels.difficulty}</span>

                    <select
                      value={aiDifficulty}
                      onChange={(e) => {
                        setAiDifficulty(e.target.value as Difficulty);
                        setAiRequestId(null);
                      }}
                      disabled={!isPro || !!aiPreview || aiLoading}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white disabled:opacity-50"
                    >
                      <option value="easy">{labels.easy}</option>
                      <option value="medium">{labels.medium}</option>
                      <option value="hard">{labels.hard}</option>
                    </select>
                  </label>
                </div>

                {/* IDIOMA E TEMPO */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm text-slate-300">
                    <span className="block">{t("create.fields.language")}</span>

                    <select
                      value={language}
                      onChange={(e) => {
                        setLanguage(e.target.value as Lang);
                        setAiRequestId(null);
                      }}
                      disabled={!isPro || !!aiPreview || aiLoading}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white disabled:opacity-50"
                    >
                      <option value="en">{t("create.lang.en")}</option>
                      <option value="pt">{t("create.lang.pt")}</option>
                      <option value="es">{t("create.lang.es")}</option>
                    </select>
                  </label>

                  <label className="space-y-2 text-sm text-slate-300">
                    <span className="block">{t("create.fields.maxTime")}</span>

                    <input
                      type="number"
                      min={5}
                      max={300}
                      value={maxTimeSec}
                      disabled={!isPro || aiSaving}
                      onChange={(e) =>
                        setMaxTimeSec(
                          Math.max(
                            5,
                            Math.min(300, Number(e.target.value) || 20),
                          ),
                        )
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white disabled:opacity-50"
                    />
                  </label>
                </div>

                {/* INFORMAÇÃO SOBRE COTAS */}
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <p className="text-sm font-semibold text-emerald-300">
                    {labels.quota}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {labels.quotaNote}
                  </p>
                </div>

                {aiUsage && (
                  <p className="text-sm text-slate-300">
                    {labels.used}:{" "}
                    <strong className="text-emerald-300">
                      {aiUsage.used}/{aiUsage.limit}
                    </strong>{" "}
                    ({aiUsage.month} UTC)
                  </p>
                )}

                {aiError && (
                  <p
                    role="alert"
                    className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200"
                  >
                    {aiError}
                  </p>
                )}

                {!aiPreview ? (
                  // BOTÃO GERAR
                  <button
                    type="button"
                    onClick={generateAiQuiz}
                    disabled={!isPro || aiLoading || aiSaving}
                    className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-blue-500 px-5 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {aiLoading ? labels.generating : `✦ ${labels.ai}`}
                  </button>
                ) : (
                  // ==============================================
                  // PRÉ-VISUALIZAÇÃO DO QUIZ GERADO
                  // ==============================================

                  <div className="space-y-4 border-t border-slate-700 pt-5">
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        {aiPreview.title}
                      </h3>

                      <p className="mt-1 text-sm text-amber-300">
                        {labels.generated}
                      </p>
                    </div>

                    <ol className="space-y-3">
                      {aiPreview.questions.map((question, index) => (
                        <li
                          key={index}
                          className="rounded-xl border border-slate-700 bg-slate-800/70 p-4"
                        >
                          <p className="font-semibold text-white">
                            {index + 1}. {question.text}
                          </p>

                          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                            {question.options.map((option, optionIndex) => (
                              <li
                                key={optionIndex}
                                className={`rounded-lg px-3 py-2 text-sm ${
                                  optionIndex === question.correctIndex
                                    ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                                    : "bg-slate-900 text-slate-300"
                                }`}
                              >
                                {String.fromCharCode(65 + optionIndex)}.{" "}
                                {option}
                              </li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ol>

                    {/* AÇÕES */}
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={discardAiQuiz}
                        disabled={aiSaving}
                        className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-5 py-3 font-semibold text-rose-200 hover:bg-rose-500/20 disabled:opacity-50"
                      >
                        {labels.discard}
                      </button>

                      <button
                        type="button"
                        onClick={saveAiQuiz}
                        disabled={aiSaving || !isPro}
                        className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {aiSaving ? labels.saving : labels.save}
                      </button>
                    </div>
                  </div>
                )}
              </section>
            ) : (
              // ==================================================
              // CRIAÇÃO MANUAL
              // ==================================================

              <div className="mt-4 sm:mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm shadow-xl p-4 sm:p-6 space-y-6 sm:space-y-8">
                {/* CONFIGURAÇÕES BÁSICAS */}
                <section>
                  <h2 className="text-slate-200 font-semibold mb-3">
                    {t("create.setupTitle")}
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* TÍTULO */}
                    <div>
                      <label className="text-sm block mb-1 text-slate-300">
                        {t("create.fields.title")}
                      </label>

                      <input
                        className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={t("create.fields.titlePlaceholder")}
                      />
                    </div>

                    {/* TEMPO */}
                    <div>
                      <label className="text-sm block mb-1 text-slate-300">
                        {t("create.fields.maxTime")}
                      </label>

                      <input
                        type="number"
                        min={5}
                        max={300}
                        className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        value={maxTimeSec}
                        onChange={(e) =>
                          setMaxTimeSec(
                            Math.max(
                              5,
                              Math.min(300, Number(e.target.value) || 20),
                            ),
                          )
                        }
                      />

                      <p className="text-xs text-slate-400 mt-1">
                        {t("create.fields.maxTimeHint")}
                      </p>
                    </div>

                    {/* IDIOMA */}
                    <div>
                      <label className="text-sm block mb-1 text-slate-300">
                        {t("create.fields.language")}
                      </label>

                      <select
                        className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as Lang)}
                      >
                        <option value="en">{t("create.lang.en")}</option>
                        <option value="pt">{t("create.lang.pt")}</option>
                        <option value="es">{t("create.lang.es")}</option>
                      </select>
                    </div>
                  </div>
                </section>

                {/* EDITOR DE PERGUNTAS */}
                <section>
                  <h2 className="text-slate-200 font-semibold mb-3">
                    {t("create.questions.title")}
                  </h2>

                  <div className="space-y-3">
                    <input
                      className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                      placeholder={t("create.questions.placeholderQuestion")}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                    />

                    {/* ALTERNATIVAS */}
                    {opts.map((option, index) => (
                      <div
                        key={index}
                        className="relative overflow-hidden rounded-lg"
                      >
                        <input
                          className="w-full px-3 py-2.5 pr-24 sm:pr-28 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                          placeholder={`${t(
                            "create.questions.option",
                          )} ${index + 1}`}
                          value={option}
                          onChange={(e) => {
                            const clone = [...opts];
                            clone[index] = e.target.value;
                            setOpts(clone);
                          }}
                        />

                        <label className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-2 px-2 py-1 bg-slate-900/70 backdrop-blur-sm border border-slate-700 rounded-md text-slate-300 text-xs sm:text-[13px] whitespace-nowrap shadow-sm">
                          <input
                            type="radio"
                            name="correct-answer"
                            className="accent-emerald-500 shrink-0"
                            checked={index === correctIndex}
                            onChange={() => setCorrectIndex(index)}
                          />

                          <span className="hidden sm:inline">
                            {t("create.questions.correct")}
                          </span>
                        </label>
                      </div>
                    ))}

                    {/* CONTROLE DE ALTERNATIVAS */}
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={removeOption}
                        disabled={opts.length <= MIN_OPTIONS}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {labels.removeOption}
                      </button>

                      <span className="text-sm text-slate-400">
                        {opts.length} de {MAX_OPTIONS} {labels.optionCount}
                      </span>

                      <button
                        type="button"
                        onClick={addOption}
                        disabled={opts.length >= MAX_OPTIONS}
                        className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {labels.addOption}
                      </button>
                    </div>

                    {/* ADICIONAR PERGUNTA */}
                    <button
                      type="button"
                      onClick={addLocalQuestion}
                      disabled={qCount >= limit || manualSaving}
                      className={`w-full sm:w-auto px-4 py-2.5 rounded-lg font-medium transition ${
                        qCount >= limit || manualSaving
                          ? "bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed"
                          : "bg-indigo-600 hover:bg-indigo-500 text-white"
                      }`}
                      title={
                        qCount >= limit
                          ? t("create.limit.freeReached", {
                              defaultValue:
                                "You reached the limit of {{limit}} questions.",
                              limit,
                            })
                          : undefined
                      }
                    >
                      {t("create.questions.add")}
                    </button>
                  </div>

                  {/* LISTA DAS PERGUNTAS ADICIONADAS */}
                  {questions.length > 0 && (
                    <ul className="mt-4 space-y-2">
                      {questions.map((question, index) => (
                        <li
                          key={index}
                          className="p-3 sm:p-4 rounded-xl border border-slate-800 bg-slate-900/70 hover:bg-slate-900 transition"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                            <div className="min-w-0">
                              <div className="font-medium text-slate-100">
                                {index + 1}. {question.text}
                              </div>

                              <ol className="text-sm mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                                {question.options.map((option, optionIndex) => (
                                  <li
                                    key={optionIndex}
                                    className={`px-2 py-1 rounded break-words ${
                                      optionIndex === question.correctIndex
                                        ? "text-emerald-300 bg-emerald-500/10 border border-emerald-500/30"
                                        : "text-slate-300"
                                    }`}
                                  >
                                    {option}
                                  </li>
                                ))}
                              </ol>
                            </div>

                            <div className="sm:pl-3">
                              <button
                                type="button"
                                onClick={() => removeLocalQuestion(index)}
                                disabled={manualSaving}
                                className="w-full sm:w-auto px-3 py-2 rounded-lg text-rose-100 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-sm disabled:opacity-50"
                              >
                                {t("create.questions.remove")}
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {/* FOOTER */}
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
                  <p className="text-xs text-amber-300/90 border border-amber-500/30 rounded-xl px-3 py-2 bg-amber-500/5">
                    {isPro
                      ? t("create.ttl.pro", {
                          defaultValue:
                            "Pro plan: your data will be kept without auto-deletion.",
                        })
                      : `⚠️ ${t("create.ttl")}`}
                  </p>

                  <button
                    type="button"
                    onClick={createGroup}
                    disabled={manualSaving}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-semibold hover:opacity-90 active:opacity-100 transition disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {manualSaving ? labels.saving : t("create.cta.createGroup")}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
