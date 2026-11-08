import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import {
  ArrowRight,
  Check,
  ChevronRight,
  ChevronDown,
  Crown,
  Gamepad2,
  Globe2,
  LogIn,
  Menu,
  Play,
  Sparkles,
  Trophy,
  Users,
  X,
  Zap,
  WandSparkles,
  HelpCircle,
  MessageCircle,
  Timer,
} from "lucide-react";

import { auth } from "../lib/firebase";
import LanguageSwitcher from "../components/LanguageSwitcher";
import AvatarCircle from "../components/ui/avatar-circle";
import AuthPanel from "../components/ui/auth-panel";
import PricingPlans from "../components/ui/pricing-plans";
import Dialog from "../components/ui/dialog";
import Footer from "../components/ui/footer";
import { useStripeUpgrade } from "../hooks/useStripeUpgrade";

type Lang = "pt" | "en" | "es";
type AuthStep = "none" | "choose" | "login" | "register";
type DialogVariant = "info" | "success" | "warning" | "danger";

const NYXIE_IMAGE = "/nyxie-home.png";
const NYXIE_IMAGE_IA = "/nyxie-ia.png";
const LOGO_IMAGE = "/logo-top-game-score.png";

const copy = {
  pt: {
    navFeatures: "Recursos",
    navPlans: "Planos",
    navFaq: "FAQ",
    enter: "Entrar",
    dashboard: "Meu painel",
    mobileMenu: "Abrir menu",

    eyebrow: "A plataforma de quizzes ao vivo",
    heroLine1: "Quizzes ao vivo",
    heroLine2: "para streamers e criadores",
    heroLine3: "de conteúdo",
    heroHighlight: "GAMERS",
    heroDescription:
      "Crie quizzes personalizados, jogue em tempo real com seu público e veja o placar ao vivo, de forma simples e divertida.",
    createQuiz: "Criar quiz agora",
    joinWithCode: "Entrar com código",
    benefit1: "Rápido de configurar",
    benefit2: "Multilíngue (EN, PT, ES)",
    benefit3: "Grátis para começar",

    whatTitleStart: "O que é o",
    whatTitleEnd: "TopGameScore?",
    whatDescription:
      "Uma plataforma completa para criar e jogar quizzes ao vivo, feita especialmente para streamers e criadores de conteúdo do mundo gamer.",

    feature1: "Quizzes ao vivo",
    feature1Desc: "Jogue com seu público em tempo real.",
    feature2: "Interação divertida",
    feature2Desc: "Mais engajamento e entretenimento nas suas lives.",
    feature3: "Placar automático",
    feature3Desc: "Pontuação e resultados na hora.",
    feature4: "Feita para o universo gamer",
    feature4Desc: "Ideal para lives, eventos, comunidades e desafios.",

    aiBadge: "Conheça a Nyxie",
    aiTitle1: "Gere quizzes com IA",
    aiTitle2: "em segundos!",
    aiDescription:
      "A Nyxie cria quizzes completos sobre temas do universo gamer, com perguntas, respostas e nível de dificuldade, tudo na hora!",
    aiBenefit1: "Rápido",
    aiBenefit2: "Personalizado",
    aiBenefit3: "Pronto para jogar",
    aiScreenTitle: "Gerar quiz com IA",
    aiPlaceholder: "Ex: Minecraft, Valorant, GTA...",
    aiButton: "Gerar com a Nyxie",
    aiProNotice: "Recurso exclusivo do plano Pro",

    howTitle1: "Como",
    howTitle2: "funciona?",
    howDescription:
      "Crie, jogue e interaja com seu público em apenas 3 passos.",
    step1: "Crie o quiz",
    step1Desc: "Monte do seu jeito ou gere um quiz com a IA da Nyxie.",
    step2: "Jogue ao vivo",
    step2Desc: "Compartilhe o código com seu público.",
    step3: "Acompanhe o placar",
    step3Desc: "Veja os resultados em tempo real e mantenha o engajamento.",

    pricingBannerTitle: "Planos para o seu jeito de jogar",
    pricingBannerDesc:
      "Comece grátis e faça upgrade quando precisar de mais recursos.",
    viewPlans: "Ver planos",
    pricingTitle: "Escolha o plano ideal",
    pricingDescription:
      "Comece gratuitamente e evolua conforme sua necessidade.",

    joinTitle: "Já recebeu um código?",
    joinDescription:
      "Digite o código compartilhado pelo organizador para participar.",
    joinPlaceholder: "Código da partida",
    joinButton: "Entrar na partida",
    joinInvalid: "Informe o código da partida.",

    faqBadge: "Dúvidas frequentes",
    faqTitle: "Perguntas frequentes",
    faqDescription: "Tudo o que você precisa saber antes de começar.",
    faq1: "Como funciona a geração de quiz com IA?",
    faq1Answer:
      "No plano Pro, você informa um tema do universo gamer e a Nyxie gera automaticamente as perguntas, alternativas e respostas. Você pode visualizar o quiz antes de salvá-lo. São até 30 gerações por mês.",
    faq2: "Como os jogadores entram no quiz?",
    faq2Answer:
      "O organizador compartilha o código da partida. Os participantes digitam esse código no TopGameScore e entram no quiz para jogar ao vivo.",
    faq3: "Existe limite de perguntas?",
    faq3Answer:
      "Sim. O plano gratuito permite até 10 perguntas por quiz. No plano Pro, você pode criar quizzes com até 30 perguntas.",
    faq4: "Quais idiomas são suportados?",
    faq4Answer:
      "A interface do TopGameScore está disponível em português brasileiro, inglês e espanhol.",

    finalTitle1: "Pronto para",
    finalTitle2: "turbinar suas lives?",
    finalDescription:
      "Crie quizzes incríveis, interaja com sua comunidade e conte com a Nyxie para gerar quizzes em segundos!",

    authTitle: "Sua aventura começa agora",
    authDescription: "Entre ou crie sua conta para preparar o próximo quiz.",
    close: "Fechar",

    footerDescription:
      "Quizzes ao vivo para streamers e criadores de conteúdo gamers.",

    seoTitle: "TopGameScore | Quizzes ao vivo para gamers",
    seoDescription:
      "Crie quizzes ao vivo para streamers e criadores de conteúdo gamers. Gere perguntas com a Nyxie, nossa IA, e interaja com seu público em tempo real.",
  },

  en: {
    navFeatures: "Features",
    navPlans: "Pricing",
    navFaq: "FAQ",
    enter: "Sign in",
    dashboard: "Dashboard",
    mobileMenu: "Open menu",

    eyebrow: "The live quiz platform",
    heroLine1: "Live quizzes",
    heroLine2: "for streamers and",
    heroLine3: "content creators",
    heroHighlight: "GAMERS",
    heroDescription:
      "Create custom quizzes, play with your audience in real time and watch the live leaderboard. Simple, fast and fun.",
    createQuiz: "Create a quiz",
    joinWithCode: "Join with a code",
    benefit1: "Quick to set up",
    benefit2: "Multilingual (EN, PT, ES)",
    benefit3: "Free to get started",

    whatTitleStart: "What is",
    whatTitleEnd: "TopGameScore?",
    whatDescription:
      "A complete platform for creating and playing live quizzes, designed especially for streamers and gaming content creators.",

    feature1: "Live quizzes",
    feature1Desc: "Play with your audience in real time.",
    feature2: "Fun interaction",
    feature2Desc: "More engagement and entertainment during your streams.",
    feature3: "Automatic leaderboard",
    feature3Desc: "Instant scoring and results.",
    feature4: "Built for gamers",
    feature4Desc: "Perfect for streams, events, communities and challenges.",

    aiBadge: "Meet Nyxie",
    aiTitle1: "Generate AI quizzes",
    aiTitle2: "in seconds!",
    aiDescription:
      "Nyxie creates complete quizzes about gaming topics, including questions, answers and difficulty levels, instantly!",
    aiBenefit1: "Fast",
    aiBenefit2: "Personalized",
    aiBenefit3: "Ready to play",
    aiScreenTitle: "Generate an AI quiz",
    aiPlaceholder: "E.g. Minecraft, Valorant, GTA...",
    aiButton: "Generate with Nyxie",
    aiProNotice: "Exclusive to the Pro plan",

    howTitle1: "How does it",
    howTitle2: "work?",
    howDescription:
      "Create, play and engage with your audience in just 3 steps.",
    step1: "Create a quiz",
    step1Desc: "Build your own quiz or generate one with Nyxie's AI.",
    step2: "Play live",
    step2Desc: "Share the game code with your audience.",
    step3: "Track the leaderboard",
    step3Desc: "See real-time results and keep your audience engaged.",

    pricingBannerTitle: "Plans for the way you play",
    pricingBannerDesc: "Start free and upgrade when you need more features.",
    viewPlans: "View plans",
    pricingTitle: "Choose your perfect plan",
    pricingDescription: "Start free and upgrade as you grow.",

    joinTitle: "Already have a code?",
    joinDescription: "Enter the code shared by the host to join.",
    joinPlaceholder: "Game code",
    joinButton: "Join game",
    joinInvalid: "Please enter a game code.",

    faqBadge: "Frequently asked questions",
    faqTitle: "Frequently asked questions",
    faqDescription: "Everything you need to know before getting started.",
    faq1: "How does AI quiz generation work?",
    faq1Answer:
      "With the Pro plan, enter a gaming-related topic and Nyxie automatically generates questions, answer options and correct answers. Preview your quiz before saving. Up to 30 generations per month.",
    faq2: "How do players join a quiz?",
    faq2Answer:
      "The host shares the game code. Players enter it on TopGameScore to join the live quiz.",
    faq3: "Is there a question limit?",
    faq3Answer:
      "Yes. The free plan allows up to 10 questions per quiz. The Pro plan allows up to 30 questions per quiz.",
    faq4: "Which languages are supported?",
    faq4Answer:
      "The TopGameScore interface is available in Brazilian Portuguese, English and Spanish.",

    finalTitle1: "Ready to",
    finalTitle2: "level up your streams?",
    finalDescription:
      "Create amazing quizzes, engage your community and let Nyxie generate quizzes in seconds!",

    authTitle: "Your adventure starts now",
    authDescription: "Sign in or create an account to set up your next quiz.",
    close: "Close",

    footerDescription:
      "Live quizzes for streamers and gaming content creators.",

    seoTitle: "TopGameScore | Live quizzes for gamers",
    seoDescription:
      "Create live quizzes for streamers and gaming content creators. Generate questions with Nyxie AI and engage your audience in real time.",
  },

  es: {
    navFeatures: "Funciones",
    navPlans: "Planes",
    navFaq: "FAQ",
    enter: "Iniciar sesión",
    dashboard: "Mi panel",
    mobileMenu: "Abrir menú",

    eyebrow: "La plataforma de quizzes en vivo",
    heroLine1: "Quizzes en vivo",
    heroLine2: "para streamers y creadores",
    heroLine3: "de contenido",
    heroHighlight: "GAMERS",
    heroDescription:
      "Crea quizzes personalizados, juega en tiempo real con tu público y sigue la clasificación en vivo de forma fácil y divertida.",
    createQuiz: "Crear quiz ahora",
    joinWithCode: "Entrar con código",
    benefit1: "Fácil de configurar",
    benefit2: "Multilingüe (EN, PT, ES)",
    benefit3: "Gratis para comenzar",

    whatTitleStart: "¿Qué es",
    whatTitleEnd: "TopGameScore?",
    whatDescription:
      "Una plataforma completa para crear y jugar quizzes en vivo, diseñada especialmente para streamers y creadores de contenido gamer.",

    feature1: "Quizzes en vivo",
    feature1Desc: "Juega con tu público en tiempo real.",
    feature2: "Interacción divertida",
    feature2Desc: "Más participación y entretenimiento en tus directos.",
    feature3: "Clasificación automática",
    feature3Desc: "Puntuación y resultados al instante.",
    feature4: "Creada para gamers",
    feature4Desc: "Ideal para directos, eventos, comunidades y desafíos.",

    aiBadge: "Conoce a Nyxie",
    aiTitle1: "Genera quizzes con IA",
    aiTitle2: "¡en segundos!",
    aiDescription:
      "Nyxie crea quizzes completos sobre temas del universo gamer, con preguntas, respuestas y niveles de dificultad, ¡al instante!",
    aiBenefit1: "Rápido",
    aiBenefit2: "Personalizado",
    aiBenefit3: "Listo para jugar",
    aiScreenTitle: "Generar quiz con IA",
    aiPlaceholder: "Ej.: Minecraft, Valorant, GTA...",
    aiButton: "Generar con Nyxie",
    aiProNotice: "Exclusivo del plan Pro",

    howTitle1: "¿Cómo",
    howTitle2: "funciona?",
    howDescription: "Crea, juega e interactúa con tu público en solo 3 pasos.",
    step1: "Crea el quiz",
    step1Desc: "Hazlo a tu manera o genera uno con la IA de Nyxie.",
    step2: "Juega en vivo",
    step2Desc: "Comparte el código con tu público.",
    step3: "Sigue la clasificación",
    step3Desc:
      "Consulta los resultados en tiempo real y mantén la interacción.",

    pricingBannerTitle: "Planes para tu forma de jugar",
    pricingBannerDesc:
      "Comienza gratis y mejora tu plan cuando necesites más funciones.",
    viewPlans: "Ver planes",
    pricingTitle: "Elige tu plan ideal",
    pricingDescription: "Comienza gratis y crece según tus necesidades.",

    joinTitle: "¿Ya tienes un código?",
    joinDescription:
      "Introduce el código compartido por el organizador para participar.",
    joinPlaceholder: "Código de partida",
    joinButton: "Entrar a la partida",
    joinInvalid: "Introduce un código de partida.",

    faqBadge: "Preguntas frecuentes",
    faqTitle: "Preguntas frecuentes",
    faqDescription: "Todo lo que necesitas saber antes de comenzar.",
    faq1: "¿Cómo funciona la generación de quizzes con IA?",
    faq1Answer:
      "Con el plan Pro, introduces un tema gamer y Nyxie genera automáticamente preguntas, opciones y respuestas correctas. Puedes revisar el quiz antes de guardarlo. Hasta 30 generaciones al mes.",
    faq2: "¿Cómo entran los jugadores al quiz?",
    faq2Answer:
      "El organizador comparte el código de partida. Los participantes lo introducen en TopGameScore para jugar en vivo.",
    faq3: "¿Existe un límite de preguntas?",
    faq3Answer:
      "Sí. El plan gratuito permite hasta 10 preguntas por quiz y el plan Pro permite hasta 30.",
    faq4: "¿Qué idiomas están disponibles?",
    faq4Answer:
      "La interfaz de TopGameScore está disponible en portugués brasileño, inglés y español.",

    finalTitle1: "¿Listo para",
    finalTitle2: "potenciar tus directos?",
    finalDescription:
      "Crea quizzes increíbles, interactúa con tu comunidad y deja que Nyxie genere quizzes en segundos.",

    authTitle: "Tu aventura comienza ahora",
    authDescription:
      "Inicia sesión o crea una cuenta para preparar tu próximo quiz.",
    close: "Cerrar",

    footerDescription:
      "Quizzes en vivo para streamers y creadores de contenido gamer.",

    seoTitle: "TopGameScore | Quizzes en vivo para gamers",
    seoDescription:
      "Crea quizzes en vivo para streamers y creadores de contenido gamer. Genera preguntas con Nyxie IA e interactúa con tu público.",
  },
} as const;

type Copy = (typeof copy)["pt"];

const featureDefinitions = [
  {
    icon: Zap,
    title: "feature1",
    description: "feature1Desc",
    color: "emerald",
  },
  {
    icon: Gamepad2,
    title: "feature2",
    description: "feature2Desc",
    color: "cyan",
  },
  {
    icon: Trophy,
    title: "feature3",
    description: "feature3Desc",
    color: "yellow",
  },
  {
    icon: Users,
    title: "feature4",
    description: "feature4Desc",
    color: "purple",
  },
] as const;

const featureColors = {
  emerald: "bg-emerald-400/10 text-emerald-400",
  cyan: "bg-cyan-400/10 text-cyan-400",
  yellow: "bg-yellow-400/10 text-yellow-400",
  purple: "bg-purple-400/10 text-purple-400",
};

const faqKeys = [
  ["faq1", "faq1Answer"],
  ["faq2", "faq2Answer"],
  ["faq3", "faq3Answer"],
  ["faq4", "faq4Answer"],
] as const;

function GradientButton({
  children,
  onClick,
  type = "button",
  className = "",
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[
        "group inline-flex items-center justify-center gap-3",
        "rounded-xl bg-gradient-to-r from-[#24f57e] to-[#14d5d5]",
        "px-6 py-3.5 font-extrabold text-[#06131a]",
        "shadow-[0_10px_35px_rgba(17,225,164,0.12)]",
        "transition-all duration-200",
        "hover:-translate-y-0.5 hover:brightness-110",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function SectionHeading({
  first,
  highlight,
  description,
}: {
  first: string;
  highlight: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <h2 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-[42px]">
        {first}{" "}
        <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          {highlight}
        </span>
      </h2>

      <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
        {description}
      </p>
    </div>
  );
}

function CheckBenefit({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 text-xs font-medium text-slate-200 sm:text-sm">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-emerald-400 text-emerald-400">
        <Check size={12} strokeWidth={3} />
      </span>
      {children}
    </div>
  );
}

function FaqAccordion({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={[
        "overflow-hidden rounded-xl border transition-colors",
        open
          ? "border-cyan-400/40 bg-[#14233b]"
          : "border-slate-600/45 bg-[#101b30] hover:border-slate-500",
      ].join(" ")}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="text-sm font-bold text-white sm:text-base">
          {question}
        </span>

        <ChevronDown
          size={18}
          className={[
            "shrink-0 text-cyan-400 transition-transform",
            open ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      {open && (
        <div className="border-t border-white/5 px-5 pb-5 pt-3">
          <p className="text-sm leading-7 text-slate-300">{answer}</p>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const { t, i18n } = useTranslation();
  const nav = useNavigate();

  const { loading: stripeLoading, startCheckout } = useStripeUpgrade();

  const [user, setUser] = useState<User | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [aiTopic, setAiTopic] = useState("");

  const [authStep, setAuthStep] = useState<AuthStep>("none");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [dlgOpen, setDlgOpen] = useState(false);
  const [dlgTitle, setDlgTitle] = useState("");
  const [dlgMsg, setDlgMsg] = useState<ReactNode>("");
  const [dlgVariant, setDlgVariant] = useState<DialogVariant>("info");

  const authSectionRef = useRef<HTMLDivElement>(null);
  const joinSectionRef = useRef<HTMLElement>(null);

  const detectedLang = (i18n.resolvedLanguage || i18n.language || "pt").split(
    "-",
  )[0];

  const lang: Lang =
    detectedLang === "pt" || detectedLang === "en" || detectedLang === "es"
      ? detectedLang
      : "pt";

  const c: Copy = copy[lang] as Copy;
  const isLoggedIn = Boolean(user && !user.isAnonymous);

  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  const hostName =
    user?.displayName ||
    (user?.email ? user.email.split("@")[0] : "") ||
    (isLoggedIn ? "host" : "");

  const hostInitials = useMemo(() => {
    return hostName
      ? hostName
          .split(/[._-]/g)
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase() ?? "")
          .join("")
      : "H";
  }, [hostName]);

  const siteUrl = (
    import.meta.env.VITE_SITE_URL || "https://topgamescore.com"
  ).replace(/\/$/, "");

  function scrollToId(id: string) {
    setMobileMenuOpen(false);

    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function scrollToRef(ref: RefObject<HTMLElement | null>) {
    ref.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function openDialog(
    title: string,
    message: ReactNode,
    variant: DialogVariant = "info",
  ) {
    setDlgTitle(title);
    setDlgMsg(message);
    setDlgVariant(variant);
    setDlgOpen(true);
  }

  function toLoginEmail(value: string) {
    const input = value.trim();
    return input.includes("@") ? input : `${input}@host.local`;
  }

  function handleCreateQuizClick() {
    if (isLoggedIn) {
      nav("/create");
      return;
    }

    setAuthStep("choose");
    setMobileMenuOpen(false);

    requestAnimationFrame(() => {
      scrollToRef(authSectionRef);
    });
  }

  function handleTopLoginClick() {
    if (isLoggedIn) {
      nav("/dashboard");
      return;
    }

    setAuthStep("login");
    setMobileMenuOpen(false);

    requestAnimationFrame(() => {
      scrollToRef(authSectionRef);
    });
  }

  function handleGenerateWithNyxie() {
    // A geração efetiva continua na tela de criação,
    // que já aplica autenticação, plano e limite mensal.
    //
    // Não enviamos o tema por URL porque a CreateQuizPage
    // atual ainda não possui contrato de leitura desse valor.
    // O campo aqui funciona como demonstração visual.

    if (isLoggedIn) {
      nav("/create");
      return;
    }

    handleCreateQuizClick();
  }

  async function handleLogin() {
    const id = username.trim();

    if (!id || id.includes(" ") || !password) {
      openDialog(
        t("common.attention"),
        t("home.host.errors.usernameOrPassword"),
        "warning",
      );
      return;
    }

    setAuthLoading(true);

    try {
      await signInWithEmailAndPassword(auth, toLoginEmail(id), password);

      nav("/dashboard");
    } catch (error) {
      console.error("Login error:", error);

      openDialog(
        t("common.error"),
        t("home.host.errors.loginGeneric"),
        "danger",
      );
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleRegister() {
    const id = username.trim();
    const em = email.trim();
    const validEmail = /^\S+@\S+\.\S+$/.test(em);

    if (!id || id.includes(" ") || !password || !validEmail) {
      openDialog(
        t("common.attention"),
        t("home.host.errors.usernamePasswordEmail"),
        "warning",
      );
      return;
    }

    setAuthLoading(true);

    try {
      await createUserWithEmailAndPassword(auth, em, password);

      nav("/create");
    } catch (error) {
      console.error("Registration error:", error);

      openDialog(
        t("common.error"),
        t("home.host.errors.registerGeneric"),
        "danger",
      );
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleForgotPassword() {
    const em = email.trim();

    if (!/^\S+@\S+\.\S+$/.test(em)) {
      openDialog(
        t("common.attention"),
        t("home.host.errors.validEmailRequired"),
        "warning",
      );
      return;
    }

    try {
      await sendPasswordResetEmail(auth, em);

      openDialog(
        t("common.success"),
        t("home.host.resetPassword.sent"),
        "success",
      );
    } catch (error) {
      console.error("Password reset error:", error);

      openDialog(
        t("common.error"),
        t("home.host.resetPassword.failed"),
        "danger",
      );
    }
  }

  async function handleSelectPro(billing: "monthly" | "annual") {
    if (!auth.currentUser) {
      openDialog(t("common.attention"), t("pricing.loginRequired"), "warning");
      return;
    }

    openDialog(t("pricing.title"), t("pricing.redirecting"), "info");

    const result = await startCheckout(billing, i18n.language);

    if (!result.ok && result.reason === "error") {
      openDialog(t("common.error"), t("pricing.error"), "danger");
    }
  }

  function handleSelectFree() {
    if (isLoggedIn) {
      nav("/create");
      return;
    }

    handleCreateQuizClick();
  }

  function handleJoinGame() {
    const code = joinCode.trim();

    if (!code) {
      openDialog(t("common.attention"), c.joinInvalid, "warning");
      return;
    }

    nav(`/play/${encodeURIComponent(code)}`);
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "TopGameScore",
        url: siteUrl,
        inLanguage: lang === "pt" ? "pt-BR" : lang,
      },
      {
        "@type": "SoftwareApplication",
        name: "TopGameScore",
        applicationCategory: "GameApplication",
        operatingSystem: "Web",
        url: siteUrl,
        description: c.seoDescription,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: faqKeys.map(([question, answer]) => ({
          "@type": "Question",
          name: c[question],
          acceptedAnswer: {
            "@type": "Answer",
            text: c[answer],
          },
        })),
      },
    ],
  };

  const alternates = [
    { lang: "x-default", href: siteUrl },
    { lang: "en", href: `${siteUrl}?lng=en` },
    { lang: "pt-BR", href: `${siteUrl}?lng=pt` },
    { lang: "es", href: `${siteUrl}?lng=es` },
  ];

  return (
    <>
      <Helmet>
        <html lang={lang === "pt" ? "pt-BR" : lang} />

        <title>{c.seoTitle}</title>

        <meta name="description" content={c.seoDescription} />

        <link rel="canonical" href={siteUrl} />

        {alternates.map((item) => (
          <link
            key={item.lang}
            rel="alternate"
            hrefLang={item.lang}
            href={item.href}
          />
        ))}

        <meta property="og:site_name" content="TopGameScore" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={siteUrl} />
        <meta property="og:title" content={c.seoTitle} />
        <meta property="og:description" content={c.seoDescription} />
        <meta property="og:image" content={`${siteUrl}/og.png`} />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={c.seoTitle} />
        <meta name="twitter:description" content={c.seoDescription} />

        <meta name="theme-color" content="#06111d" />

        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="relative min-h-screen overflow-hidden bg-[#06101e] text-white">
        {/* BACKGROUND GLOBAL */}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute -left-72 top-0 h-[850px] w-[850px] rounded-full bg-emerald-500/[0.08] blur-[150px]" />

          <div className="absolute -right-64 top-0 h-[850px] w-[850px] rounded-full bg-purple-600/[0.13] blur-[160px]" />

          <div
            className="absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
        </div>

        {/* ATMOSFERA DO HERO */}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[850px] overflow-hidden"
        >
          <div className="absolute -left-[290px] top-[80px] h-[820px] w-[330px] rotate-[39deg] bg-gradient-to-r from-emerald-500/0 via-emerald-400/20 to-cyan-400/5" />

          <div className="absolute left-[47%] top-[-360px] h-[1100px] w-[115px] rotate-[39deg] bg-gradient-to-r from-cyan-400/0 via-cyan-400/30 to-emerald-300/5 shadow-[0_0_75px_rgba(12,220,200,0.12)]" />

          <div className="absolute right-[1%] top-[-320px] h-[1150px] w-[260px] rotate-[39deg] bg-gradient-to-r from-purple-600/0 via-fuchsia-600/25 to-purple-500/5" />

          <div className="absolute -right-[10%] top-[-350px] h-[1150px] w-[90px] rotate-[39deg] bg-fuchsia-500/20" />

          <Gamepad2
            className="absolute right-[3%] top-[115px] h-[300px] w-[300px] -rotate-[22deg] text-cyan-400/[0.14] sm:h-[400px] sm:w-[400px]"
            strokeWidth={1.3}
          />

          <div
            className="absolute left-0 top-[85px] h-44 w-32 opacity-45"
            style={{
              backgroundImage:
                "radial-gradient(circle, #10f5b0 1.6px, transparent 2px)",
              backgroundSize: "15px 15px",
              maskImage: "linear-gradient(to right, black, transparent)",
            }}
          />

          <div
            className="absolute right-0 top-[420px] h-44 w-36 opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(circle, #b84cff 1.6px, transparent 2px)",
              backgroundSize: "15px 15px",
              maskImage: "linear-gradient(to left, black, transparent)",
            }}
          />
        </div>

        {/* HEADER */}

        <header className="relative z-30 border-b border-white/10 bg-[#071322]/35 shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-xl">
          <div className="mx-auto flex h-20 w-full max-w-[1600px] items-center justify-between gap-5 px-5 sm:px-8 lg:px-12 xl:px-16">
            <button
              type="button"
              onClick={() =>
                window.scrollTo({
                  top: 0,
                  behavior: "smooth",
                })
              }
              className="flex shrink-0 items-center"
              aria-label="TopGameScore"
            >
              <img
                src={LOGO_IMAGE}
                alt="TopGameScore"
                className="h-auto w-40 sm:w-48 lg:w-56"
              />
            </button>

            <nav
              aria-label="Main navigation"
              className="hidden items-center gap-9 lg:flex"
            >
              <button
                type="button"
                onClick={() => scrollToId("features")}
                className="text-sm font-semibold text-slate-200 transition hover:text-emerald-400"
              >
                {c.navFeatures}
              </button>

              <button
                type="button"
                onClick={() => scrollToId("pricing")}
                className="text-sm font-semibold text-slate-200 transition hover:text-emerald-400"
              >
                {c.navPlans}
              </button>

              <button
                type="button"
                onClick={() => scrollToId("faq")}
                className="text-sm font-semibold text-slate-200 transition hover:text-emerald-400"
              >
                {c.navFaq}
              </button>
            </nav>

            <div className="hidden items-center gap-4 sm:flex">
              <LanguageSwitcher />

              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={() => nav("/dashboard")}
                  className="flex max-w-[240px] items-center gap-2 rounded-full border border-white/20 bg-white/5 py-1.5 pl-2 pr-4 text-sm font-semibold transition hover:bg-white/10"
                >
                  <AvatarCircle initials={hostInitials} />

                  <span className="truncate">{hostName}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleTopLoginClick}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-400/60 bg-white/5 px-5 py-2.5 text-sm font-bold transition hover:border-emerald-400 hover:bg-white/10"
                >
                  <LogIn size={17} />
                  {c.enter}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((value) => !value)}
              className="rounded-xl border border-white/15 bg-white/5 p-2.5 text-white lg:hidden"
              aria-label={c.mobileMenu}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={23} /> : <Menu size={23} />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="border-t border-white/10 bg-[#0b1626]/95 px-5 py-5 backdrop-blur-xl lg:hidden">
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => scrollToId("features")}
                  className="rounded-xl px-4 py-3 text-left text-sm font-semibold hover:bg-white/5"
                >
                  {c.navFeatures}
                </button>

                <button
                  type="button"
                  onClick={() => scrollToId("pricing")}
                  className="rounded-xl px-4 py-3 text-left text-sm font-semibold hover:bg-white/5"
                >
                  {c.navPlans}
                </button>

                <button
                  type="button"
                  onClick={() => scrollToId("faq")}
                  className="rounded-xl px-4 py-3 text-left text-sm font-semibold hover:bg-white/5"
                >
                  {c.navFaq}
                </button>

                <div className="my-2 border-t border-white/10" />

                <LanguageSwitcher />

                <button
                  type="button"
                  onClick={handleTopLoginClick}
                  className="mt-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300"
                >
                  {isLoggedIn ? c.dashboard : c.enter}
                </button>
              </div>
            </div>
          )}
        </header>

        <main className="relative z-10">
          {/* HERO */}

          <section className="relative isolate overflow-hidden">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute right-[3%] top-[8%] h-[440px] w-[440px] rounded-full bg-purple-600/10 blur-[105px]"
            />

            <div className="mx-auto grid w-full max-w-[1600px] items-center gap-4 px-5 pb-12 pt-12 sm:px-8 md:pt-16 lg:min-h-[520px] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:px-12 lg:pb-12 lg:pt-16 xl:min-h-[560px] xl:px-16">
              <div className="relative z-20 max-w-[800px]">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/[0.07] px-4 py-2 text-xs font-semibold tracking-wide text-emerald-300">
                  <Gamepad2 size={16} />
                  {c.eyebrow}
                </div>

                <h1 className="text-[clamp(2.45rem,4.2vw,4.75rem)] font-black leading-[1.1] tracking-[-0.045em]">
                  <span className="block bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                    {c.heroLine1}
                  </span>

                  <span className="block text-white">{c.heroLine2}</span>

                  <span className="block text-white">
                    {c.heroLine3}{" "}
                    <span className="bg-gradient-to-r from-[#23f581] to-[#14d8a9] bg-clip-text text-transparent">
                      {c.heroHighlight}
                    </span>
                  </span>
                </h1>

                <p className="mt-6 max-w-[640px] text-base leading-relaxed text-slate-300 sm:text-lg">
                  {c.heroDescription}
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
                  <GradientButton
                    onClick={handleCreateQuizClick}
                    className="min-h-14 sm:min-w-[235px]"
                  >
                    <Gamepad2 size={21} />
                    {c.createQuiz}
                    <ArrowRight
                      size={18}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </GradientButton>

                  <button
                    type="button"
                    onClick={() => scrollToRef(joinSectionRef)}
                    className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl border border-slate-500/70 bg-[#0b1729]/70 px-7 text-base font-bold text-white transition hover:-translate-y-0.5 hover:border-cyan-400 hover:bg-[#12233a] sm:min-w-[220px]"
                  >
                    <Users size={21} />
                    {c.joinWithCode}
                  </button>
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3">
                  <CheckBenefit>{c.benefit1}</CheckBenefit>

                  <CheckBenefit>{c.benefit2}</CheckBenefit>

                  <CheckBenefit>{c.benefit3}</CheckBenefit>
                </div>
              </div>

              {/* NYXIE PRINCIPAL */}

              <div className="relative z-10 flex min-h-[310px] items-center justify-center sm:min-h-[400px] lg:absolute lg:bottom-0 lg:right-0 lg:top-0 lg:w-[51%] lg:items-end lg:justify-end">
                <div
                  aria-hidden="true"
                  className="absolute inset-0 m-auto h-[75%] w-[75%] rounded-full bg-gradient-to-br from-emerald-400/20 via-cyan-400/10 to-purple-500/25 blur-[80px]"
                />

                <img
                  src={NYXIE_IMAGE}
                  alt="Nyxie, mascote do TopGameScore"
                  className="relative z-10 max-h-[430px] w-auto max-w-full object-contain object-bottom drop-shadow-[0_20px_50px_rgba(12,245,190,0.16)] sm:max-h-[500px] lg:max-h-[570px] xl:max-h-[630px]"
                  loading="eager"
                  fetchPriority="high"
                />
              </div>
            </div>
          </section>

          {/* O QUE É O TOPGAMESCORE */}

          <section
            id="features"
            className="relative scroll-mt-24 border-t border-white/10 py-14 sm:py-16"
          >
            <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8 lg:px-12 xl:px-16">
              <SectionHeading
                first={c.whatTitleStart}
                highlight={c.whatTitleEnd}
                description={c.whatDescription}
              />

              <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {featureDefinitions.map((feature) => {
                  const Icon = feature.icon;

                  return (
                    <div
                      key={feature.title}
                      className="group rounded-2xl border border-cyan-400/20 bg-[#101e32]/85 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.15)] transition-all duration-200 hover:-translate-y-1 hover:border-cyan-400/50 hover:bg-[#14253b] sm:p-6"
                    >
                      <div
                        className={[
                          "mb-4 flex h-14 w-14 items-center justify-center rounded-2xl",
                          featureColors[feature.color],
                        ].join(" ")}
                      >
                        <Icon size={30} strokeWidth={2.3} />
                      </div>

                      <h3 className="text-base font-extrabold text-white lg:text-lg">
                        {c[feature.title]}
                      </h3>

                      <p className="mt-2 text-sm leading-relaxed text-slate-300">
                        {c[feature.description]}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* DESTAQUE NYXIE / IA */}

          <section id="nyxie" className="relative scroll-mt-24 py-4 sm:py-6">
            <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8 lg:px-12 xl:px-16">
              <div className="relative isolate overflow-hidden rounded-[26px] border border-fuchsia-400/70 bg-gradient-to-r from-[#21113d] via-[#19183d] to-[#33104e] shadow-[0_0_38px_rgba(184,55,255,0.19)]">
                {/* LUZES DO BANNER */}

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 overflow-hidden"
                >
                  <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-purple-500/20 blur-[90px]" />

                  <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-[90px]" />

                  <div className="absolute left-1/2 top-0 h-60 w-60 rounded-full bg-cyan-500/10 blur-[75px]" />

                  <div className="absolute -right-16 top-0 h-full w-32 rotate-[35deg] bg-fuchsia-500/10" />
                </div>

                <div className="relative grid min-h-[330px] gap-6 p-6 sm:p-8 lg:grid-cols-[0.95fr_0.6fr_1.05fr] lg:items-center lg:gap-2 lg:p-10">
                  {/* TEXTO DA IA */}

                  <div className="relative z-20">
                    <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-fuchsia-400/50 bg-fuchsia-500/10 px-4 py-2 text-sm font-bold text-fuchsia-200">
                      <Sparkles size={17} />
                      {c.aiBadge}
                    </div>

                    <h2 className="text-3xl font-black leading-[1.12] tracking-tight sm:text-4xl xl:text-[43px]">
                      <span className="block text-white">{c.aiTitle1}</span>

                      <span className="block bg-gradient-to-r from-[#2bf47d] to-[#11dfb6] bg-clip-text text-transparent">
                        {c.aiTitle2}
                      </span>
                    </h2>

                    <p className="mt-5 max-w-[440px] text-sm leading-relaxed text-slate-100 sm:text-base">
                      {c.aiDescription}
                    </p>

                    <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3">
                      <CheckBenefit>{c.aiBenefit1}</CheckBenefit>

                      <CheckBenefit>{c.aiBenefit2}</CheckBenefit>

                      <CheckBenefit>{c.aiBenefit3}</CheckBenefit>
                    </div>

                    <div className="mt-5 inline-flex items-center gap-2 text-xs text-fuchsia-200/80">
                      <Crown size={14} />
                      {c.aiProNotice}
                    </div>
                  </div>

                  {/* NYXIE NO BANNER DE IA */}

                  <div className="pointer-events-none relative z-10 hidden h-full min-h-[290px] items-end justify-center lg:flex">
                    <div className="absolute bottom-0 h-[220px] w-[220px] rounded-full bg-fuchsia-400/20 blur-[70px]" />

                    <img
                      src={NYXIE_IMAGE_IA}
                      alt="Nyxie, assistente de IA do TopGameScore"
                      loading="lazy"
                      className="relative z-10 max-h-[350px] w-auto max-w-[125%] object-contain object-bottom drop-shadow-[0_10px_35px_rgba(234,55,255,0.25)]"
                    />
                  </div>

                  {/* NOTEBOOK / DEMONSTRAÇÃO */}

                  <div className="relative z-20 mx-auto w-full max-w-[470px]">
                    <div className="absolute -right-3 -top-5 z-30 flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-fuchsia-300 bg-[#54137b] text-2xl font-black shadow-[0_0_25px_rgba(228,80,255,0.8)] sm:h-20 sm:w-20">
                      IA
                    </div>

                    <div className="rounded-t-[20px] border-[5px] border-[#8275a5] bg-[#080d1e] p-4 shadow-[0_0_45px_rgba(206,55,255,0.35)] sm:p-6">
                      <div className="mb-6 flex justify-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                      </div>

                      <div className="mb-5 flex items-center justify-center gap-2 text-lg font-extrabold">
                        <Sparkles size={21} className="text-fuchsia-400" />
                        {c.aiScreenTitle}
                      </div>

                      <div className="flex items-center gap-3 rounded-xl border border-fuchsia-400/70 bg-[#19223c] px-4 py-3">
                        <Gamepad2
                          size={22}
                          className="shrink-0 text-cyan-300"
                        />

                        <input
                          type="text"
                          value={aiTopic}
                          onChange={(event) => setAiTopic(event.target.value)}
                          placeholder={c.aiPlaceholder}
                          aria-label={c.aiPlaceholder}
                          className="w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-400"
                        />
                      </div>

                      <GradientButton
                        onClick={handleGenerateWithNyxie}
                        className="mx-auto mt-5 w-full max-w-[270px] py-3"
                      >
                        <Sparkles size={19} />
                        {c.aiButton}
                      </GradientButton>
                    </div>

                    <div className="relative mx-auto h-3 w-[110%] -translate-x-[4.5%] rounded-b-[55%] bg-gradient-to-b from-[#a69abd] to-[#544a75] shadow-[0_10px_25px_rgba(0,0,0,0.5)]">
                      <div className="absolute left-1/2 top-0 h-1.5 w-20 -translate-x-1/2 rounded-b-xl bg-[#4c4264]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* COMO FUNCIONA */}

          <section id="how-it-works" className="relative py-16 sm:py-20">
            <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8 lg:px-12 xl:px-16">
              <SectionHeading
                first={c.howTitle1}
                highlight={c.howTitle2}
                description={c.howDescription}
              />

              <div className="mt-10 grid gap-5 lg:grid-cols-3">
                {[
                  {
                    number: "1",
                    icon: WandSparkles,
                    title: c.step1,
                    description: c.step1Desc,
                    color: "text-fuchsia-400",
                  },
                  {
                    number: "2",
                    icon: Users,
                    title: c.step2,
                    description: c.step2Desc,
                    color: "text-purple-400",
                  },
                  {
                    number: "3",
                    icon: Trophy,
                    title: c.step3,
                    description: c.step3Desc,
                    color: "text-yellow-400",
                  },
                ].map((step, index) => {
                  const Icon = step.icon;

                  return (
                    <div
                      key={step.number}
                      className="relative flex min-h-[140px] items-center gap-5 rounded-2xl border border-cyan-400/20 bg-[#101e32]/85 p-5 sm:p-6"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-xl font-black text-[#06131a]">
                        {step.number}
                      </div>

                      <Icon
                        size={38}
                        className={`shrink-0 ${step.color}`}
                        strokeWidth={2}
                      />

                      <div>
                        <h3 className="text-base font-extrabold sm:text-lg">
                          {step.title}
                        </h3>

                        <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                          {step.description}
                        </p>
                      </div>

                      {index < 2 && (
                        <ChevronRight
                          size={28}
                          className="absolute -right-[26px] top-1/2 z-10 hidden -translate-y-1/2 text-emerald-400 lg:block"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* BANNER DE PLANOS */}

          <section className="mx-auto w-full max-w-[1600px] px-5 sm:px-8 lg:px-12 xl:px-16">
            <div className="relative flex flex-col items-start gap-6 overflow-hidden rounded-2xl border border-purple-500/40 bg-gradient-to-r from-[#191632] via-[#111d34] to-[#23133f] p-6 shadow-[0_15px_40px_rgba(0,0,0,0.18)] sm:p-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400">
                  <Crown size={37} fill="currentColor" />
                </div>

                <div>
                  <h2 className="text-xl font-extrabold sm:text-2xl">
                    {c.pricingBannerTitle}
                  </h2>

                  <p className="mt-2 text-sm text-slate-300 sm:text-base">
                    {c.pricingBannerDesc}
                  </p>
                </div>
              </div>

              <GradientButton
                onClick={() => scrollToId("pricing")}
                className="w-full sm:w-auto"
              >
                {c.viewPlans}
                <ArrowRight size={19} />
              </GradientButton>
            </div>
          </section>

          {/* PAINEL DE AUTENTICAÇÃO */}

          <div ref={authSectionRef} id="auth" className="scroll-mt-24">
            {authStep !== "none" && (
              <section className="mx-auto mt-12 w-full max-w-[1600px] px-5 sm:px-8 lg:px-12 xl:px-16">
                <div className="mx-auto max-w-3xl rounded-3xl border border-emerald-400/30 bg-[#0e1a2b]/95 p-5 shadow-[0_0_60px_rgba(16,185,129,0.08)] sm:p-8">
                  <div className="mb-6 flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold sm:text-2xl">
                        {c.authTitle}
                      </h2>

                      <p className="mt-2 text-sm text-slate-400">
                        {c.authDescription}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setAuthStep("none")}
                      className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10"
                      aria-label={c.close}
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <AuthPanel
                    step={authStep}
                    onBack={() =>
                      setAuthStep(authStep === "choose" ? "none" : "choose")
                    }
                    onChooseLogin={() => setAuthStep("login")}
                    onChooseRegister={() => setAuthStep("register")}
                    username={username}
                    password={password}
                    setUsername={setUsername}
                    setPassword={setPassword}
                    email={email}
                    setEmail={setEmail}
                    onForgotPassword={handleForgotPassword}
                    onLogin={handleLogin}
                    onRegister={handleRegister}
                    loading={authLoading}
                    t={t as any}
                  />
                </div>
              </section>
            )}
          </div>

          {/* ENTRAR COM CÓDIGO */}

          <section
            ref={joinSectionRef}
            id="join"
            className="mx-auto mt-16 w-full max-w-[1600px] scroll-mt-24 px-5 sm:px-8 lg:px-12 xl:px-16"
          >
            <div className="grid gap-6 rounded-2xl border border-cyan-500/20 bg-[#0c1b2d]/90 p-6 shadow-xl sm:p-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-400">
                  <Gamepad2 size={28} />
                </div>

                <div>
                  <h2 className="text-xl font-extrabold sm:text-2xl">
                    {c.joinTitle}
                  </h2>

                  <p className="mt-2 text-sm text-slate-300">
                    {c.joinDescription}
                  </p>
                </div>
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  handleJoinGame();
                }}
                className="flex flex-col gap-3 sm:flex-row"
              >
                <input
                  type="text"
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value)}
                  placeholder={c.joinPlaceholder}
                  aria-label={c.joinPlaceholder}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="min-h-13 min-w-0 flex-1 rounded-xl border border-slate-600/60 bg-[#1c2a40] px-5 text-base text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                />

                <GradientButton
                  type="submit"
                  disabled={!joinCode.trim()}
                  className="min-h-13"
                >
                  <LogIn size={18} />
                  {c.joinButton}
                </GradientButton>
              </form>
            </div>
          </section>

          {/* PLANOS */}

          <section
            id="pricing"
            className="mx-auto mt-20 w-full max-w-[1600px] scroll-mt-24 px-5 sm:px-8 lg:px-12 xl:px-16"
          >
            <div className="mb-9 text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-purple-300">
                <Crown size={15} />
                {c.navPlans}
              </div>

              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                {c.pricingTitle}
              </h2>

              <p className="mt-3 text-sm text-slate-400 sm:text-base">
                {c.pricingDescription}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-700/60 bg-[#0d1729]/85 p-4 shadow-2xl backdrop-blur-xl sm:p-7 lg:p-10">
              <PricingPlans
                freeLimit={10}
                onSelectFree={handleSelectFree}
                onSelectPro={handleSelectPro}
                isBusy={stripeLoading === "checkout"}
              />
            </div>
          </section>

          {/* FAQ */}

          <section
            id="faq"
            className="mx-auto mt-20 w-full max-w-[1600px] scroll-mt-24 px-5 pb-20 sm:px-8 lg:px-12 xl:px-16"
          >
            <div className="grid gap-9 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
              <div>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-cyan-300">
                  <HelpCircle size={16} />
                  {c.faqBadge}
                </div>

                <h2 className="text-3xl font-black sm:text-4xl">
                  {c.faqTitle}
                </h2>

                <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-300 sm:text-base">
                  {c.faqDescription}
                </p>
              </div>

              <div className="space-y-3">
                {faqKeys.map(([question, answer]) => (
                  <FaqAccordion
                    key={question}
                    question={c[question]}
                    answer={c[answer]}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* CTA FINAL */}

          <section className="relative isolate overflow-hidden border-y border-white/10 bg-gradient-to-r from-[#062a30] via-[#0c2039] to-[#29103e]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 overflow-hidden"
            >
              <div className="absolute -left-28 top-0 h-80 w-32 rotate-[38deg] bg-emerald-400/25" />

              <div className="absolute -right-12 top-0 h-80 w-28 rotate-[38deg] bg-purple-500/30" />

              <div
                className="absolute left-0 top-0 h-full w-32 opacity-30"
                style={{
                  backgroundImage:
                    "radial-gradient(circle, #14f5c2 1.5px, transparent 2px)",
                  backgroundSize: "15px 15px",
                  maskImage: "linear-gradient(to right, black, transparent)",
                }}
              />
            </div>

            <div className="relative mx-auto flex w-full max-w-[1600px] flex-col items-start gap-7 px-5 py-10 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-12 xl:px-16">
              <div className="flex items-center gap-6">
                <Gamepad2
                  size={70}
                  strokeWidth={1.3}
                  className="hidden shrink-0 -rotate-12 text-cyan-400/70 sm:block"
                />

                <div>
                  <h2 className="text-2xl font-black sm:text-3xl">
                    {c.finalTitle1}{" "}
                    <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                      {c.finalTitle2}
                    </span>
                  </h2>

                  <p className="mt-3 max-w-[650px] text-sm leading-relaxed text-slate-200 sm:text-base">
                    {c.finalDescription}
                  </p>
                </div>
              </div>

              <GradientButton
                onClick={handleCreateQuizClick}
                className="w-full shrink-0 sm:w-auto"
              >
                <Play size={19} fill="currentColor" />
                {c.createQuiz}
                <ChevronRight size={19} />
              </GradientButton>
            </div>
          </section>
        </main>
      </div>

      {/* FOOTER EXISTENTE */}

      <Footer />

      {/* DIALOG EXISTENTE */}

      <Dialog
        open={dlgOpen}
        onClose={() => setDlgOpen(false)}
        title={dlgTitle}
        description={dlgMsg}
        variant={dlgVariant}
      />
    </>
  );
}
