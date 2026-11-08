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

// ⬇️ Se você já criou o hook de plano e o botão de upgrade, use-os:
import { useUserPlan } from "../hooks/useUserPlan";
// import { UpgradeButton } from '../components/billing/UpgradeButton';

type Lang = "en" | "pt" | "es";
type CreationMode = "manual" | "ai";
type Difficulty = "easy" | "medium" | "hard";
type QuizQuestion = { text: string; options: string[]; correctIndex: number };
type GeneratedQuiz = { title: string; questions: QuizQuestion[] };

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
    comingSoon: "Gerar quiz com IA (em preparação)",
    comingSoonNote:
      "A integração com a OpenAI e o controle de cotas serão implementados na próxima etapa.",
    manualCounter: "perguntas adicionadas",
    remaining: "restantes",
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
    comingSoon: "Generate quiz with AI (coming soon)",
    comingSoonNote:
      "OpenAI integration and quota enforcement will be added in the next step.",
    manualCounter: "questions added",
    remaining: "remaining",
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
    comingSoon: "Generar quiz con IA (próximamente)",
    comingSoonNote:
      "La integración con OpenAI y el control de cuotas se implementarán en el siguiente paso.",
    manualCounter: "preguntas añadidas",
    remaining: "restantes",
  },
} as const;

const FREE_QUESTION_LIMIT = 10;
const MAX_QUESTION_LIMIT = 30;

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 5;

export default function CreateQuizPage() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage || i18n.language || "en").split(
    "-",
  )[0] as Lang;
  const labels = ui[lang] || ui.en;
  const nav = useNavigate();

  const { plan, active } = useUserPlan(); // 'free' | 'pro'
  const isPro = plan === "pro" && active;
  const limit = isPro ? MAX_QUESTION_LIMIT : FREE_QUESTION_LIMIT;

  const [mode, setMode] = useState<CreationMode | null>(null);
  const [aiTopic, setAiTopic] = useState("");
  const [aiQuestionCount, setAiQuestionCount] = useState(10);
  const [aiOptionCount, setAiOptionCount] = useState(4);
  const [aiDifficulty, setAiDifficulty] = useState<Difficulty>("medium");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiPreview, setAiPreview] = useState<GeneratedQuiz | null>(null);
  const [aiUsage, setAiUsage] = useState<{
    used: number;
    limit: number;
    month: string;
  } | null>(null);
  const [aiRequestId, setAiRequestId] = useState<string | null>(null);

  const [title, setTitle] = useState("Quiz");
  const [maxTimeSec, setMaxTimeSec] = useState(20);
  const [language, setLanguage] = useState<Lang>("en");

  const [text, setText] = useState("");
  const [opts, setOpts] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);

  const [questions, setQuestions] = useState<
    { text: string; options: string[]; correctIndex: number }[]
  >([]);

  // contagem e restante (para UI)
  const qCount = questions.length;
  const remaining = useMemo(() => Math.max(0, limit - qCount), [limit, qCount]);

  useEffect(() => {
    if (!auth.currentUser) nav("/");
  }, [nav]);

  async function generateAiQuiz() {
    if (aiLoading || !isPro || aiPreview) return;
    if (aiTopic.trim().length < 3 || aiTopic.trim().length > 300) {
      setAiError(
        lang === "pt"
          ? "Informe um tema com 3 a 300 caracteres."
          : lang === "es"
            ? "Introduce un tema de 3 a 300 caracteres."
            : "Enter a topic between 3 and 300 characters.",
      );
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      setAiError(t("create.toast.signInRequired"));
      return;
    }
    setAiLoading(true);
    setAiError("");
    // Reutilize o mesmo identificador após erros de rede para evitar consumo duplicado.
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
          topic: aiTopic.trim(),
          questionCount: aiQuestionCount,
          optionsPerQuestion: aiOptionCount,
          difficulty: aiDifficulty,
          language,
        }),
      });
      const data: unknown = await response.json();
      if (!data || typeof data !== "object")
        throw new Error("Resposta inválida do servidor.");
      const result = data as {
        error?: string;
        quiz?: GeneratedQuiz;
        usage?: { used: number; limit: number; month: string };
      };
      if (!response.ok) {
        // Falhas de validação ou cota não representam uma geração válida.
        if ([400, 403, 422, 429].includes(response.status))
          setAiRequestId(null);
        throw new Error(result.error || `Erro HTTP ${response.status}`);
      }
      if (
        !result.quiz ||
        !Array.isArray(result.quiz.questions) ||
        result.quiz.questions.length !== aiQuestionCount ||
        result.quiz.questions.some(
          (q) =>
            !q.text ||
            q.options.length !== aiOptionCount ||
            q.correctIndex < 0 ||
            q.correctIndex >= q.options.length,
        )
      ) {
        throw new Error("O servidor retornou um quiz inválido.");
      }
      setAiPreview(result.quiz);
      if (result.usage) setAiUsage(result.usage);
    } catch (error) {
      setAiError(
        error instanceof Error
          ? error.message
          : "Não foi possível gerar o quiz.",
      );
    } finally {
      setAiLoading(false);
    }
  }

  function discardAiQuiz() {
    if (!aiPreview || aiLoading) return;
    setAiPreview(null);
    setAiRequestId(null);
    setAiError("");
  }

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
      alert("Cada pergunta deve ter entre 2 e 5 alternativas.");
      return;
    }

    if (correctIndex < 0 || correctIndex >= cleanOptions.length) {
      alert("Selecione uma alternativa correta.");
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
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
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

  async function createGroup() {
    if (!auth.currentUser) {
      alert(t("create.toast.signInRequired"));
      return;
    }

    // defesa extra no create (client-side): não permitir criar grupo acima do limite no free
    if (qCount === 0) {
      alert("Adicione pelo menos uma pergunta antes de criar o quiz.");
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
        question.correctIndex < 0 ||
        question.correctIndex >= question.options.length,
    );

    if (invalidQuestion) {
      alert("Existem perguntas ou alternativas inválidas.");
      return;
    }

    if (mode !== "manual") return;

    try {
      const user = auth.currentUser;
      const hostUid = user.uid;
      const now = Timestamp.now();

      // Nome e email do host (para mostrar no admin)
      const hostEmail = user.email ?? null;
      const hostName =
        user.displayName || (hostEmail ? hostEmail.split("@")[0] : null);

      // Plano free: expira em 7 dias; Pro: sem expiração (null)
      const expiresAt = isPro
        ? null
        : Timestamp.fromMillis(now.toMillis() + 7 * 24 * 60 * 60 * 1000);

      // Criação do grupo
      const ref = await addDoc(collection(db, "groups"), {
        hostUid,
        hostName,
        hostEmail,
        code: "",
        title: title || "Quiz",
        createdAt: serverTimestamp(),
        expiresAt,
        status: "draft",
        currentQuestionIndex: -1,
        questionCount: qCount,
        roundStartedAt: null,
        maxTimeSec: Number(maxTimeSec) || 20,
        locale: language,
        plan: isPro ? "pro" : "free", // salva o plano vigente
        creationMethod: "manual",
      });

      // código = id do grupo
      await setDoc(ref, { code: ref.id }, { merge: true });

      // Perguntas em batch
      if (qCount > 0) {
        const batch = writeBatch(db);
        questions.forEach((q, index) => {
          const qRef = doc(collection(db, "groups", ref.id, "questions"));
          batch.set(qRef, { ...q, index });
        });
        await batch.commit();
      }

      nav("/dashboard");
    } catch (err: any) {
      console.error("Erro ao criar grupo:", err);
      alert(
        `Erro ao criar grupo: ${
          err?.message || "verifique o console do navegador para mais detalhes."
        }`,
      );
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,.20),transparent_40%),radial-gradient(ellipse_at_bottom_right,rgba(59,130,246,.18),transparent_40%)]">
      <div className="mx-auto max-w-4xl p-4 sm:p-6">
        {/* Top bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={() => history.back()}
            className="w-fit text-sm text-slate-300 hover:text-white transition"
          >
            ← {t("common.back")}
          </button>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            {/* Badge de plano */}
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
                ? t("create.limit.badge.pro", { defaultValue: "Pro" })
                : t("create.limit.badge.free", { defaultValue: "Free" })}
            </span>

            {/* CTA Upgrade — mostre apenas se for free */}
            {!isPro && (
              // Descomente se já tiver o componente
              // <UpgradeButton />
              <button
                onClick={() => nav("/")}
                className="px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-blue-500 text-white text-sm font-semibold hover:opacity-90 transition"
              >
                {t("create.limit.upgradeCta", { defaultValue: "Upgrade" })}
              </button>
            )}

            <LanguageSwitcher />
          </div>
        </div>

        {/* Header */}
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

        {mode === null ? (
          <section className="mt-6 space-y-4">
            <h2 className="text-xl font-bold text-white">{labels.choose}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
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
                    disabled={!isPro}
                    maxLength={500}
                    rows={3}
                    placeholder={labels.topicPlaceholder}
                    className="w-full resize-y rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="space-y-2 text-sm text-slate-300">
                    {" "}
                    <span className="block">{labels.count}</span>
                    <select
                      value={aiQuestionCount}
                      onChange={(e) => {
                        setAiQuestionCount(Number(e.target.value));
                        setAiRequestId(null);
                      }}
                      disabled={!isPro}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white disabled:opacity-50"
                    >
                      {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2 text-sm text-slate-300">
                    {" "}
                    <span className="block">{labels.alternatives}</span>
                    <select
                      value={aiOptionCount}
                      onChange={(e) => {
                        setAiOptionCount(Number(e.target.value));
                        setAiRequestId(null);
                      }}
                      disabled={!isPro}
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
                    {" "}
                    <span className="block">{labels.difficulty}</span>
                    <select
                      value={aiDifficulty}
                      onChange={(e) => {
                        setAiDifficulty(e.target.value as Difficulty);
                        setAiRequestId(null);
                      }}
                      disabled={!isPro}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white disabled:opacity-50"
                    >
                      <option value="easy">{labels.easy}</option>
                      <option value="medium">{labels.medium}</option>
                      <option value="hard">{labels.hard}</option>
                    </select>
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm text-slate-300">
                    <span className="block">{t("create.fields.language")}</span>
                    <select
                      value={language}
                      onChange={(e) => {
                        setLanguage(e.target.value as Lang);
                        setAiRequestId(null);
                      }}
                      disabled={!isPro}
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
                      disabled={!isPro}
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
                    {lang === "pt"
                      ? "Gerações utilizadas"
                      : lang === "es"
                        ? "Generaciones utilizadas"
                        : "Generations used"}
                    :{" "}
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
                  <button
                    type="button"
                    onClick={generateAiQuiz}
                    disabled={!isPro || aiLoading}
                    className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-blue-500 px-5 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {aiLoading
                      ? lang === "pt"
                        ? "Gerando perguntas..."
                        : lang === "es"
                          ? "Generando preguntas..."
                          : "Generating questions..."
                      : `✦ ${labels.ai}`}
                  </button>
                ) : (
                  <div className="space-y-4 border-t border-slate-700 pt-5">
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        {aiPreview.title}
                      </h3>
                      <p className="mt-1 text-sm text-amber-300">
                        {lang === "pt"
                          ? "Geração concluída. Uma cota foi consumida, mesmo que você descarte o resultado."
                          : lang === "es"
                            ? "Generación completada. Se consumió un crédito aunque descartes el resultado."
                            : "Generation completed. One credit was used even if you discard the result."}
                      </p>
                    </div>
                    <ol className="space-y-3">
                      {aiPreview.questions.map((q, index) => (
                        <li
                          key={index}
                          className="rounded-xl border border-slate-700 bg-slate-800/70 p-4"
                        >
                          <p className="font-semibold text-white">
                            {index + 1}. {q.text}
                          </p>
                          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                            {q.options.map((option, optionIndex) => (
                              <li
                                key={optionIndex}
                                className={`rounded-lg px-3 py-2 text-sm ${optionIndex === q.correctIndex ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-200" : "bg-slate-900 text-slate-300"}`}
                              >
                                {String.fromCharCode(65 + optionIndex)}.{" "}
                                {option}
                              </li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ol>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={discardAiQuiz}
                        className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-5 py-3 font-semibold text-rose-200 hover:bg-rose-500/20"
                      >
                        {lang === "pt"
                          ? "Descartar quiz"
                          : lang === "es"
                            ? "Descartar quiz"
                            : "Discard quiz"}
                      </button>
                      <button
                        type="button"
                        disabled
                        title="Aguardando endpoint de salvamento seguro"
                        className="cursor-not-allowed rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white opacity-50"
                      >
                        {lang === "pt"
                          ? "Salvar quiz (próxima etapa)"
                          : lang === "es"
                            ? "Guardar quiz (siguiente etapa)"
                            : "Save quiz (next step)"}
                      </button>
                    </div>
                  </div>
                )}
              </section>
            ) : (
              <>
                {/* Card principal */}
                <div className="mt-4 sm:mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm shadow-xl p-4 sm:p-6 space-y-6 sm:space-y-8">
                  {/* Configurações básicas */}
                  <section>
                    <h2 className="text-slate-200 font-semibold mb-3">
                      {t("create.setupTitle")}
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-sm block mb-1 text-slate-300">
                          {t("create.fields.title")}
                        </label>
                        <input
                          className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder={t("create.fields.titlePlaceholder")!}
                        />
                      </div>

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

                  {/* Editor de perguntas */}
                  <section>
                    <h2 className="text-slate-200 font-semibold mb-3">
                      {t("create.questions.title")}
                    </h2>

                    <div className="space-y-3">
                      <input
                        className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                        placeholder={t("create.questions.placeholderQuestion")!}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                      />

                      {opts.map((v, i) => (
                        <div
                          key={i}
                          className="relative overflow-hidden rounded-lg"
                        >
                          <input
                            className="w-full px-3 py-2.5 pr-24 sm:pr-28 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                            placeholder={`${t("create.questions.option")} ${i + 1}`}
                            value={v}
                            onChange={(e) => {
                              const clone = [...opts];
                              clone[i] = e.target.value;
                              setOpts(clone);
                            }}
                          />
                          <label className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-2 px-2 py-1 bg-slate-900/70 backdrop-blur-sm border border-slate-700 rounded-md text-slate-300 text-xs sm:text-[13px] whitespace-nowrap shadow-sm">
                            <input
                              type="radio"
                              className="accent-emerald-500 shrink-0"
                              checked={i === correctIndex}
                              onChange={() => setCorrectIndex(i)}
                            />
                            <span className="hidden sm:inline">
                              {t("create.questions.correct")}
                            </span>
                          </label>
                        </div>
                      ))}

                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={removeOption}
                          disabled={opts.length <= MIN_OPTIONS}
                          className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          − Remover alternativa
                        </button>

                        <span className="text-sm text-slate-400">
                          {opts.length} de {MAX_OPTIONS} alternativas
                        </span>

                        <button
                          type="button"
                          onClick={addOption}
                          disabled={opts.length >= MAX_OPTIONS}
                          className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          + Adicionar alternativa
                        </button>
                      </div>

                      <button
                        onClick={addLocalQuestion}
                        disabled={qCount >= limit}
                        className={`w-full sm:w-auto px-4 py-2.5 rounded-lg font-medium transition
                  ${
                    qCount >= limit
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

                    {/* Lista local de perguntas */}
                    {questions.length > 0 && (
                      <ul className="mt-4 space-y-2">
                        {questions.map((q, idx) => (
                          <li
                            key={idx}
                            className="p-3 sm:p-4 rounded-xl border border-slate-800 bg-slate-900/70 hover:bg-slate-900 transition"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                              <div className="min-w-0">
                                <div className="font-medium text-slate-100">
                                  {idx + 1}. {q.text}
                                </div>
                                <ol className="text-sm mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                                  {q.options.map((o, i) => (
                                    <li
                                      key={i}
                                      className={`px-2 py-1 rounded break-words ${
                                        i === q.correctIndex
                                          ? "text-emerald-300 bg-emerald-500/10 border border-emerald-500/30"
                                          : "text-slate-300"
                                      }`}
                                    >
                                      {o}
                                    </li>
                                  ))}
                                </ol>
                              </div>
                              <div className="sm:pl-3">
                                <button
                                  onClick={() => removeLocalQuestion(idx)}
                                  className="w-full sm:w-auto px-3 py-2 rounded-lg text-rose-100 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-sm"
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

                  {/* Footer */}
                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
                    <p className="text-xs text-amber-300/90 border border-amber-500/30 rounded-xl px-3 py-2 bg-amber-500/5">
                      {/* TTL muda conforme plano */}
                      {isPro
                        ? t("create.ttl.pro", {
                            defaultValue:
                              "Pro plan: your data will be kept without auto-deletion.",
                          })
                        : `⚠️ ${t("create.ttl")}`}
                    </p>
                    <button
                      onClick={createGroup}
                      className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-semibold hover:opacity-90 active:opacity-100 transition"
                    >
                      {t("create.cta.createGroup")}
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
