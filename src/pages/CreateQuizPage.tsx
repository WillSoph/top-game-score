import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Crown,
  Gamepad2,
  List,
  Clock3,
  Globe2,
  Pencil,
  HelpCircle,
  Plus,
  Trash2,
  Sparkles,
  CheckCircle2,
  X,
  ChevronDown,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
    setupHeading: "Configurar Quiz",
    setupDescription:
      "Defina as configurações e adicione as perguntas do seu quiz manual.",
    basic: "Configurações básicas",
    basicDesc: "Defina o título, o tempo de resposta e o idioma do quiz.",
    questionsHeading: "Perguntas",
    questionsDesc: "Adicione as perguntas e defina a alternativa correta.",
    timeLabel: "Tempo por questão (segundos)",
    timeHint: "Permitido: 5 a 300 segundos.",
    timeError: "Informe um tempo entre 5 e 300 segundos.",
    questionPlaceholder: "Digite a pergunta aqui...",
    optionPlaceholder: "Alternativa",
    correctLabel: "Correta",
    createLabel: "Criar quiz",
    planPro: "Plano Pro · Até 30 perguntas",
    planFree: "Plano Free · Até 10 perguntas",
    countOf: "de",
    addedHeading: "Perguntas adicionadas",
    backLabel: "Voltar",
    changeMode: "Alterar modo de criação",
    aiSubtitle: "Configure o tema e as opções para gerar seu quiz com IA.",
    chooseSubtitle: "Escolha como quer criar a sua próxima experiência.",
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
    setupHeading: "Set up Quiz",
    setupDescription: "Set the options and add questions to your manual quiz.",
    basic: "Basic settings",
    basicDesc: "Set the title, answer time, and quiz language.",
    questionsHeading: "Questions",
    questionsDesc: "Add questions and choose the correct answer.",
    timeLabel: "Time per question (seconds)",
    timeHint: "Allowed: 5 to 300 seconds.",
    timeError: "Enter a time between 5 and 300 seconds.",
    questionPlaceholder: "Type your question here...",
    optionPlaceholder: "Option",
    correctLabel: "Correct",
    createLabel: "Create quiz",
    planPro: "Pro plan · Up to 30 questions",
    planFree: "Free plan · Up to 10 questions",
    countOf: "of",
    addedHeading: "Added questions",
    backLabel: "Back",
    changeMode: "Change creation mode",
    aiSubtitle: "Set a topic and options to generate your AI quiz.",
    chooseSubtitle: "Choose how to create your next experience.",
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
    setupHeading: "Configurar Quiz",
    setupDescription:
      "Define la configuración y añade preguntas a tu quiz manual.",
    basic: "Configuración básica",
    basicDesc: "Define el título, el tiempo de respuesta y el idioma.",
    questionsHeading: "Preguntas",
    questionsDesc: "Añade preguntas y elige la respuesta correcta.",
    timeLabel: "Tiempo por pregunta (segundos)",
    timeHint: "Permitido: 5 a 300 segundos.",
    timeError: "Introduce un tiempo entre 5 y 300 segundos.",
    questionPlaceholder: "Escribe tu pregunta aquí...",
    optionPlaceholder: "Alternativa",
    correctLabel: "Correcta",
    createLabel: "Crear quiz",
    planPro: "Plan Pro · Hasta 30 preguntas",
    planFree: "Plan Gratis · Hasta 10 preguntas",
    countOf: "de",
    addedHeading: "Preguntas añadidas",
    backLabel: "Volver",
    changeMode: "Cambiar modo de creación",
    aiSubtitle: "Configura el tema y las opciones para generar tu quiz con IA.",
    chooseSubtitle: "Elige cómo crear tu próxima experiencia.",
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

  const [searchParams, setSearchParams] = useSearchParams();

  const modeParam = searchParams.get("mode");

  const selectedMode: CreationMode | null =
    modeParam === "manual" || modeParam === "ai" ? modeParam : null;

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

  const [mode, setMode] = useState<CreationMode | null>(selectedMode);

  useEffect(() => {
    setMode(selectedMode);
  }, [selectedMode]);

  function changeCreationMode(nextMode: CreationMode | null) {
    setMode(nextMode);

    if (nextMode === null) {
      setSearchParams({});
    } else {
      setSearchParams({ mode: nextMode });
    }
  }

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
  const [maxTimeInput, setMaxTimeInput] = useState("20");
  const maxTimeSec = Math.max(5, Math.min(300, Number(maxTimeInput) || 20));
  const validTime =
    /^\d+$/.test(maxTimeInput.trim()) &&
    Number(maxTimeInput) >= 5 &&
    Number(maxTimeInput) <= 300;
  function normalizeTime() {
    setMaxTimeInput(String(maxTimeSec));
  }
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

    if (!validTime) {
      setAiError(labels.timeError);
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

    if (!validTime) {
      alert(labels.timeError);
      return;
    }

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

  const fieldClass =
    "w-full min-w-0 rounded-xl border border-[#405075] bg-[#182440]/90 px-4 py-3 text-white placeholder:text-slate-400 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 disabled:opacity-50";
  const letter = ["A", "B", "C", "D", "E"];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080d23] text-white">
      {/* Fundo gamer: faixas neon, pontos e luzes */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -left-48 top-32 h-[650px] w-[650px] rounded-full bg-fuchsia-700/20 blur-[110px]" />
        <div className="absolute -right-40 bottom-0 h-[600px] w-[600px] rounded-full bg-purple-700/20 blur-[120px]" />
        <div className="absolute left-[15%] top-[-110px] h-[2px] w-[390px] -rotate-[34deg] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_18px_#22d3ee]" />
        <div className="absolute left-[38%] top-10 h-[3px] w-[290px] -rotate-[34deg] bg-gradient-to-r from-transparent via-fuchsia-500 to-transparent shadow-[0_0_18px_#d946ef]" />
        <div className="absolute -left-16 top-[230px] h-[3px] w-[290px] -rotate-[34deg] bg-gradient-to-r from-transparent via-fuchsia-500 to-transparent shadow-[0_0_18px_#d946ef]" />
        <div className="absolute -left-16 bottom-20 h-[3px] w-[320px] -rotate-[34deg] bg-gradient-to-r from-transparent via-fuchsia-500 to-transparent shadow-[0_0_18px_#d946ef]" />
        <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(#6656bd_1px,transparent_1px)] [background-size:23px_23px] [mask-image:linear-gradient(90deg,black,transparent_25%,transparent_75%,black)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1600px] px-4 pb-16 pt-6 sm:px-8 lg:px-12">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => nav("/dashboard")}
            className="inline-flex items-center gap-2 text-base font-semibold text-slate-200 transition hover:text-cyan-300"
          >
            <ArrowLeft size={20} /> {labels.backLabel}
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold ${isPro ? "border-emerald-400 bg-emerald-400/5 text-emerald-300" : "border-slate-600 bg-slate-800/80 text-slate-200"}`}
            >
              <Crown
                size={18}
                className={isPro ? "text-amber-300" : "text-slate-400"}
              />{" "}
              {isPro ? labels.planPro : labels.planFree}
            </span>
            {!isPro && (
              <button
                type="button"
                onClick={() => nav("/")}
                className="rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-3 py-2 text-sm font-bold text-slate-950"
              >
                {t("create.limit.upgradeCta", { defaultValue: "Upgrade" })}
              </button>
            )}
            <LanguageSwitcher />
          </div>
        </header>

        <div className="mt-6">
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-[42px]">
            {labels.setupHeading.split(" ")[0]}{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Quiz
            </span>
          </h1>
          <p className="mt-2 text-sm text-slate-300 sm:text-lg">
            {mode === "manual"
              ? labels.setupDescription
              : mode === "ai"
                ? labels.aiSubtitle
                : labels.chooseSubtitle}
          </p>
          {mode === "manual" && (
            <p className="mt-2 text-xs text-emerald-300">
              {qCount} / {limit} {labels.manualCounter} · {remaining}{" "}
              {labels.remaining}
            </p>
          )}
        </div>

        {mode === null ? (
          <div className="mx-auto mt-12 max-w-4xl">
            <h2 className="mb-6 text-center text-2xl font-bold">
              {labels.choose}
            </h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => changeCreationMode("manual")}
                className="group rounded-3xl border border-fuchsia-500/40 bg-[#111934]/90 p-8 text-left shadow-xl transition hover:-translate-y-1 hover:border-fuchsia-400"
              >
                <Gamepad2 size={42} className="mb-5 text-fuchsia-400" />
                <h3 className="text-xl font-bold">{labels.manual}</h3>
                <p className="mt-2 text-sm text-slate-300">
                  {labels.manualDesc}
                </p>
                <span className="mt-6 inline-flex rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  {labels.allPlans}
                </span>
              </button>
              <button
                type="button"
                onClick={() => changeCreationMode("ai")}
                className="group rounded-3xl border border-cyan-500/40 bg-[#111934]/90 p-8 text-left shadow-xl transition hover:-translate-y-1 hover:border-cyan-400"
              >
                <Sparkles size={42} className="mb-5 text-cyan-400" />
                <h3 className="text-xl font-bold">{labels.ai}</h3>
                <p className="mt-2 text-sm text-slate-300">{labels.aiDesc}</p>
                <span className="mt-6 inline-flex rounded-full bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">
                  {labels.proOnly}
                </span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => changeCreationMode(null)}
              className="mt-5 inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-200"
            >
              <ArrowLeft size={15} /> {labels.changeMode}
            </button>

            <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(220px,0.43fr)_minmax(0,1fr)] xl:gap-7">
              {/* Nyxie: PNG transparente na pasta public */}
              <aside className="relative hidden min-h-[630px] self-stretch lg:block">
                <div className="sticky top-8 flex min-h-[650px] items-center justify-center">
                  <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-600/20 blur-[80px]" />
                  <Gamepad2
                    aria-hidden
                    className="absolute right-5 top-16 rotate-12 text-fuchsia-400/80 drop-shadow-[0_0_12px_#d946ef]"
                    size={68}
                    strokeWidth={1.5}
                  />
                  <img
                    src="/nyxie-start-2.png"
                    alt="Nyxie fazendo sinais de paz com as mãos"
                    className="relative z-10 max-h-[710px] w-full object-contain object-bottom drop-shadow-[0_20px_38px_rgba(217,70,239,.24)]"
                  />
                </div>
              </aside>

              <main className="min-w-0 overflow-hidden rounded-[26px] border border-fuchsia-500/70 bg-[linear-gradient(130deg,rgba(18,21,53,.96),rgba(8,18,42,.97))] p-5 shadow-[0_20px_80px_rgba(0,0,0,.3),0_0_32px_rgba(147,51,234,.12)] sm:p-8">
                {mode === "manual" ? (
                  <>
                    <section>
                      <div className="mb-6 flex items-center gap-4">
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-fuchsia-500/70 bg-fuchsia-700/25 text-white shadow-[0_0_20px_rgba(217,70,239,.16)]">
                          <Gamepad2 size={30} />
                        </span>
                        <div>
                          <h2 className="text-xl font-bold sm:text-2xl">
                            {labels.basic}
                          </h2>
                          <p className="mt-1 text-sm text-slate-300">
                            {labels.basicDesc}
                          </p>
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-3">
                        <label className="block min-w-0 text-sm font-semibold text-slate-100">
                          {t("create.fields.title")}
                          <div className="relative mt-2">
                            <Pencil
                              size={18}
                              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"
                            />
                            <input
                              className={`${fieldClass} pl-10`}
                              value={title}
                              onChange={(e) => setTitle(e.target.value)}
                              placeholder={t("create.fields.titlePlaceholder")}
                            />
                          </div>
                        </label>
                        <label className="block min-w-0 text-sm font-semibold text-slate-100">
                          {labels.timeLabel}
                          <div className="relative mt-2">
                            <Clock3
                              size={19}
                              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400"
                            />
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              autoComplete="off"
                              className={`${fieldClass} border-emerald-400 pl-10`}
                              value={maxTimeInput}
                              onChange={(e) => {
                                if (/^\d{0,3}$/.test(e.target.value))
                                  setMaxTimeInput(e.target.value);
                              }}
                              onBlur={normalizeTime}
                              aria-invalid={!validTime}
                              aria-describedby="quiz-time-hint"
                            />
                          </div>
                          <span
                            id="quiz-time-hint"
                            className={`mt-1 block text-xs font-normal ${validTime ? "text-slate-400" : "text-rose-300"}`}
                          >
                            {validTime ? labels.timeHint : labels.timeError}
                          </span>
                        </label>
                        <label className="block min-w-0 text-sm font-semibold text-slate-100">
                          {t("create.fields.language")}
                          <div className="relative mt-2">
                            <Globe2
                              size={18}
                              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"
                            />
                            <select
                              className={`${fieldClass} appearance-none pl-10 pr-10`}
                              value={language}
                              onChange={(e) =>
                                setLanguage(e.target.value as Lang)
                              }
                            >
                              <option value="pt">{t("create.lang.pt")}</option>
                              <option value="en">{t("create.lang.en")}</option>
                              <option value="es">{t("create.lang.es")}</option>
                            </select>
                            <ChevronDown
                              size={17}
                              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-300"
                            />
                          </div>
                        </label>
                      </div>
                    </section>

                    <div className="my-7 h-px bg-gradient-to-r from-slate-600/80 via-slate-700 to-transparent" />

                    <section>
                      <div className="mb-6 flex items-center gap-4">
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-fuchsia-500/70 bg-fuchsia-700/25">
                          <List size={30} />
                        </span>
                        <div>
                          <h2 className="text-xl font-bold sm:text-2xl">
                            {labels.questionsHeading}
                          </h2>
                          <p className="mt-1 text-sm text-slate-300">
                            {labels.questionsDesc}
                          </p>
                        </div>
                      </div>
                      <div className="relative">
                        <HelpCircle
                          size={20}
                          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                        />
                        <input
                          className={`${fieldClass} pl-12`}
                          placeholder={labels.questionPlaceholder}
                          value={text}
                          onChange={(e) => setText(e.target.value)}
                        />
                      </div>
                      <div className="mt-4 space-y-2.5">
                        {opts.map((option, index) => (
                          <div
                            key={index}
                            className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:gap-3"
                          >
                            <div className="relative min-w-0">
                              <span className="pointer-events-none absolute left-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg bg-indigo-600/80 text-sm font-bold text-white">
                                {letter[index]}
                              </span>
                              <input
                                className={`${fieldClass} py-2.5 pl-12`}
                                value={option}
                                onChange={(e) =>
                                  setOpts((prev) =>
                                    prev.map((value, i) =>
                                      i === index ? e.target.value : value,
                                    ),
                                  )
                                }
                                placeholder={`${labels.optionPlaceholder} ${index + 1}`}
                              />
                            </div>
                            <label
                              className={`flex min-w-[92px] cursor-pointer items-center justify-center gap-2 rounded-xl border px-2 text-xs font-semibold transition sm:min-w-[120px] sm:text-sm ${correctIndex === index ? "border-emerald-500/25 bg-emerald-500/10 text-white" : "border-transparent bg-[#15213c] text-slate-300 hover:border-slate-600"}`}
                            >
                              <input
                                type="radio"
                                name="correct-answer"
                                className="h-4 w-4 accent-emerald-400"
                                checked={correctIndex === index}
                                onChange={() => setCorrectIndex(index)}
                              />
                              <span>{labels.correctLabel}</span>
                            </label>
                          </div>
                        ))}
                      </div>
                      <div className="mt-5 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={removeOption}
                          disabled={opts.length <= MIN_OPTIONS}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-[#182440] px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 size={17} />
                          {labels.removeOption.replace(/^[−-]\s*/, "")}
                        </button>
                        <span className="text-sm text-slate-300">
                          {opts.length} {labels.countOf} {MAX_OPTIONS}{" "}
                          {labels.optionCount}
                        </span>
                        <button
                          type="button"
                          onClick={addOption}
                          disabled={opts.length >= MAX_OPTIONS}
                          className="inline-flex items-center gap-2 rounded-xl border border-emerald-400 bg-emerald-400/5 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Plus size={18} />
                          {labels.addOption.replace(/^\+\s*/, "")}
                        </button>
                      </div>
                      <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={addLocalQuestion}
                          disabled={qCount >= limit || manualSaving}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-6 py-3 text-base font-bold text-white shadow-[0_8px_30px_rgba(124,58,237,.25)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Plus size={22} />
                          {t("create.questions.add")}
                        </button>
                        <span className="text-xs text-slate-400">
                          {qCount} / {limit} {labels.manualCounter}
                        </span>
                      </div>
                      {questions.length > 0 && (
                        <div className="mt-7 space-y-3">
                          <h3 className="text-sm font-bold text-slate-200">
                            {labels.addedHeading} ({questions.length})
                          </h3>
                          {questions.map((question, index) => (
                            <div
                              key={index}
                              className="rounded-xl border border-slate-700 bg-[#15213b] p-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <p className="font-semibold">
                                  {index + 1}. {question.text}
                                </p>
                                <button
                                  type="button"
                                  disabled={manualSaving}
                                  onClick={() => removeLocalQuestion(index)}
                                  className="rounded-lg p-2 text-rose-300 hover:bg-rose-500/10"
                                  aria-label={t("create.questions.remove")}
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                {question.options.map((option, i) => (
                                  <span
                                    key={i}
                                    className={`rounded-lg px-3 py-2 text-sm ${i === question.correctIndex ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-200" : "bg-[#0d1730] text-slate-300"}`}
                                  >
                                    {letter[i]}. {option}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                    <div className="mt-9 flex flex-col-reverse items-start justify-between gap-4 border-t border-slate-700/70 pt-6 sm:flex-row sm:items-center">
                      <p className="max-w-md rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs text-amber-300">
                        {isPro
                          ? t("create.ttl.pro", {
                              defaultValue:
                                "Pro plan: your data will be kept without auto-deletion.",
                            })
                          : t("create.ttl")}
                      </p>
                      <button
                        type="button"
                        onClick={createGroup}
                        disabled={manualSaving || !validTime}
                        className="inline-flex w-full shrink-0 items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-7 py-3.5 text-base font-extrabold text-[#071126] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                      >
                        <Gamepad2 size={24} />
                        {manualSaving ? labels.saving : labels.createLabel}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-7 flex items-center gap-4">
                      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-fuchsia-500/70 bg-fuchsia-700/25">
                        <Sparkles size={30} />
                      </span>
                      <div>
                        <h2 className="text-xl font-bold sm:text-2xl">
                          {labels.aiTitle}
                        </h2>
                        <p className="mt-1 text-sm text-slate-300">
                          {labels.aiSubtitle}
                        </p>
                      </div>
                    </div>
                    {!isPro && (
                      <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200">
                        <p>{labels.upgrade}</p>
                        <button
                          type="button"
                          onClick={() => nav("/")}
                          className="mt-3 rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-2 font-bold text-slate-950"
                        >
                          {t("create.limit.upgradeCta", {
                            defaultValue: "Upgrade",
                          })}
                        </button>
                      </div>
                    )}
                    <label className="block text-sm font-semibold">
                      {labels.topic}
                      <textarea
                        rows={3}
                        maxLength={300}
                        value={aiTopic}
                        onChange={(e) => {
                          setAiTopic(e.target.value);
                          setAiRequestId(null);
                        }}
                        disabled={!isPro || !!aiPreview || aiLoading}
                        placeholder={labels.topicPlaceholder}
                        className={`${fieldClass} mt-2 resize-y`}
                      />
                    </label>
                    <div className="mt-5 grid gap-4 sm:grid-cols-3">
                      <label className="block text-sm font-semibold">
                        {labels.count}
                        <select
                          className={`${fieldClass} mt-2`}
                          value={aiQuestionCount}
                          onChange={(e) => {
                            setAiQuestionCount(Number(e.target.value));
                            setAiRequestId(null);
                          }}
                          disabled={!isPro || !!aiPreview || aiLoading}
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
                      <label className="block text-sm font-semibold">
                        {labels.alternatives}
                        <select
                          className={`${fieldClass} mt-2`}
                          value={aiOptionCount}
                          onChange={(e) => {
                            setAiOptionCount(Number(e.target.value));
                            setAiRequestId(null);
                          }}
                          disabled={!isPro || !!aiPreview || aiLoading}
                        >
                          {[2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-sm font-semibold">
                        {labels.difficulty}
                        <select
                          className={`${fieldClass} mt-2`}
                          value={aiDifficulty}
                          onChange={(e) => {
                            setAiDifficulty(e.target.value as Difficulty);
                            setAiRequestId(null);
                          }}
                          disabled={!isPro || !!aiPreview || aiLoading}
                        >
                          <option value="easy">{labels.easy}</option>
                          <option value="medium">{labels.medium}</option>
                          <option value="hard">{labels.hard}</option>
                        </select>
                      </label>
                    </div>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <label className="block text-sm font-semibold">
                        {t("create.fields.language")}
                        <select
                          className={`${fieldClass} mt-2`}
                          value={language}
                          onChange={(e) => {
                            setLanguage(e.target.value as Lang);
                            setAiRequestId(null);
                          }}
                          disabled={!isPro || !!aiPreview || aiLoading}
                        >
                          <option value="pt">{t("create.lang.pt")}</option>
                          <option value="en">{t("create.lang.en")}</option>
                          <option value="es">{t("create.lang.es")}</option>
                        </select>
                      </label>
                      <label className="block text-sm font-semibold">
                        {labels.timeLabel}
                        <div className="relative mt-2">
                          <Clock3
                            size={18}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400"
                          />
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={maxTimeInput}
                            onChange={(e) => {
                              if (/^\d{0,3}$/.test(e.target.value))
                                setMaxTimeInput(e.target.value);
                            }}
                            onBlur={normalizeTime}
                            disabled={
                              !isPro || aiSaving || !!aiPreview || aiLoading
                            }
                            className={`${fieldClass} pl-10`}
                            aria-invalid={!validTime}
                          />
                        </div>
                        <span
                          className={`mt-1 block text-xs font-normal ${validTime ? "text-slate-400" : "text-rose-300"}`}
                        >
                          {validTime ? labels.timeHint : labels.timeError}
                        </span>
                      </label>
                    </div>
                    <div className="mt-6 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
                      <p className="font-semibold text-emerald-300">
                        {labels.quota}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {labels.quotaNote}
                      </p>
                    </div>
                    {aiUsage && (
                      <p className="mt-3 text-sm text-slate-300">
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
                        className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200"
                      >
                        {aiError}
                      </p>
                    )}
                    {!aiPreview ? (
                      <button
                        type="button"
                        onClick={generateAiQuiz}
                        disabled={!isPro || aiLoading || aiSaving || !validTime}
                        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-5 py-3.5 font-bold transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Sparkles size={20} />
                        {aiLoading ? labels.generating : labels.ai}
                      </button>
                    ) : (
                      <div className="mt-7 space-y-4 border-t border-slate-700 pt-6">
                        <h3 className="text-xl font-bold">{aiPreview.title}</h3>
                        <p className="text-sm text-amber-300">
                          {labels.generated}
                        </p>
                        <ol className="space-y-3">
                          {aiPreview.questions.map((question, index) => (
                            <li
                              key={index}
                              className="rounded-xl border border-slate-700 bg-[#15213b] p-4"
                            >
                              <p className="font-semibold">
                                {index + 1}. {question.text}
                              </p>
                              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                                {question.options.map((option, i) => (
                                  <li
                                    key={i}
                                    className={`rounded-lg px-3 py-2 text-sm ${i === question.correctIndex ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-200" : "bg-[#0d1730] text-slate-300"}`}
                                  >
                                    {letter[i]}. {option}
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
                            disabled={aiSaving}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-5 py-3 font-semibold text-rose-200 disabled:opacity-50"
                          >
                            <X size={18} />
                            {labels.discard}
                          </button>
                          <button
                            type="button"
                            onClick={saveAiQuiz}
                            disabled={aiSaving || !isPro || !validTime}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-5 py-3 font-bold text-slate-950 disabled:opacity-50"
                          >
                            <CheckCircle2 size={19} />
                            {aiSaving ? labels.saving : labels.save}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </main>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
