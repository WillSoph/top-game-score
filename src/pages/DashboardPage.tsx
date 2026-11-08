import { useEffect, useMemo, useRef, useState } from "react";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Bell,
  Check,
  ChevronDown,
  Copy,
  Crown,
  EllipsisVertical,
  Filter,
  Flag,
  Gamepad2,
  LogOut,
  Play,
  Plus,
  QrCode,
  Search,
  Sparkles,
  Trophy,
  Users,
  X,
  XCircle,
} from "lucide-react";

import { useStripeUpgrade } from "../hooks/useStripeUpgrade";
import { useUserPlan } from "../hooks/useUserPlan";
import Dialog from "../components/ui/dialog";
import LanguageSwitcher from "../components/LanguageSwitcher";

type Group = {
  id: string;
  code: string;
  title: string;
  status?: string;
  createdAt?: unknown;
};

type Winner = {
  name: string;
  totalScore: number;
};

type Language = "pt" | "en" | "es";
type FilterValue = "all" | "active" | "inactive";

const NYXIE_IMAGE = "/nyxie-home.png";

const translations = {
  pt: {
    dashboard: "Dashboard",
    welcomeStart: "Bem-vindo ao",
    welcomeEnd: "TopGameScore!",
    welcomeDescription:
      "Crie quizzes interativos para engajar sua comunidade gamer.",
    createManual: "Criar quiz manual",
    createAI: "Gerar quiz com a Nyxie (IA)",
    proOnly: "Exclusivo Pro",
    proPlan: "Plano Pro",
    freePlan: "Plano grátis",
    proDescription: "Recursos premium",
    freeDescription: "Comece gratuitamente",
    quizzesCreated: "Quizzes criados",
    activeGroups: "Grupos ativos",
    inactiveGroups: "Grupos inativos",
    totalGroups: "Total de grupos",
    myQuizzes: "Seus quizzes",
    myQuizzesDescription: "Gerencie, inicie e acompanhe seus quizzes.",
    searchPlaceholder: "Buscar quiz...",
    all: "Todos",
    active: "Ativo",
    inactive: "Inativo",
    code: "Código",
    startQuiz: "Iniciar quiz",
    finishQuiz: "Finalizar",
    qrCode: "QR Code",
    moreOptions: "Mais opções",
    manage: "Gerenciar quiz",
    copyLink: "Copiar link completo",
    copied: "Link copiado!",
    copyFailed: "Não foi possível copiar o link.",
    openLink: "Abrir link da partida",
    bestPlayer: "Melhor jogador",
    noPlayers: "Nenhum jogador ainda",
    defaultTitle: "Quiz sem título",
    noCode: "Código indisponível",
    loading: "Carregando seus quizzes...",
    loadError: "Não foi possível carregar seus quizzes.",
    retry: "Tentar novamente",
    emptyTitle: "Você ainda não criou nenhum quiz",
    emptyDescription: "Crie seu primeiro quiz manualmente ou com a Nyxie.",
    noResults: "Nenhum quiz encontrado.",
    logout: "Sair",
    close: "Fechar",
    qrDescription: "Compartilhe este QR Code com seus jogadores.",
    subscription: "Assinatura",
    subscriptionDescription:
      "Você pode cancelar a renovação e continuar usando os benefícios até o fim do período contratado.",
    cancelSubscription: "Cancelar assinatura",
    cancelTitle: "Cancelar assinatura",
    cancelDescription:
      "Sua assinatura será encerrada ao fim do período atual. Até lá, você continuará com acesso premium.",
    keepSubscription: "Manter assinatura",
    confirmCancel: "Sim, cancelar",
    canceling: "Cancelando...",
    cancelSuccess:
      "Assinatura cancelada. Você continuará com acesso premium até o fim do período atual.",
    cancelError: "Não foi possível cancelar a assinatura.",
    statusLabel: "Status do quiz",
    startHint: "Você será direcionado para controlar a partida.",
    finishHint: "Você será direcionado para finalizar a partida.",
    notifications: "Notificações",
    noNotifications: "Nenhuma notificação no momento.",
    profile: "Minha conta",
    account: "Conta",
    allQuizzes: "Todos os quizzes",
  },
  en: {
    dashboard: "Dashboard",
    welcomeStart: "Welcome to",
    welcomeEnd: "TopGameScore!",
    welcomeDescription:
      "Create interactive quizzes to engage your gaming community.",
    createManual: "Create quiz manually",
    createAI: "Generate quiz with Nyxie (AI)",
    proOnly: "Pro only",
    proPlan: "Pro plan",
    freePlan: "Free plan",
    proDescription: "Premium features",
    freeDescription: "Get started for free",
    quizzesCreated: "Quizzes created",
    activeGroups: "Active groups",
    inactiveGroups: "Inactive groups",
    totalGroups: "Total groups",
    myQuizzes: "Your quizzes",
    myQuizzesDescription: "Manage, start and track your quizzes.",
    searchPlaceholder: "Search quizzes...",
    all: "All",
    active: "Active",
    inactive: "Inactive",
    code: "Code",
    startQuiz: "Start quiz",
    finishQuiz: "Finish",
    qrCode: "QR Code",
    moreOptions: "More options",
    manage: "Manage quiz",
    copyLink: "Copy full link",
    copied: "Link copied!",
    copyFailed: "Could not copy the link.",
    openLink: "Open session link",
    bestPlayer: "Top player",
    noPlayers: "No players yet",
    defaultTitle: "Untitled quiz",
    noCode: "Code unavailable",
    loading: "Loading your quizzes...",
    loadError: "Could not load your quizzes.",
    retry: "Try again",
    emptyTitle: "You haven't created any quizzes yet",
    emptyDescription: "Create your first quiz manually or with Nyxie.",
    noResults: "No quizzes found.",
    logout: "Log out",
    close: "Close",
    qrDescription: "Share this QR Code with your players.",
    subscription: "Subscription",
    subscriptionDescription:
      "You can cancel renewal and keep your benefits until the end of the current billing period.",
    cancelSubscription: "Cancel subscription",
    cancelTitle: "Cancel subscription",
    cancelDescription:
      "Your subscription will end after the current billing period. Until then, you'll keep your premium access.",
    keepSubscription: "Keep subscription",
    confirmCancel: "Yes, cancel",
    canceling: "Canceling...",
    cancelSuccess:
      "Subscription canceled. You'll keep premium access until the end of the current billing period.",
    cancelError: "Could not cancel your subscription.",
    statusLabel: "Quiz status",
    startHint: "You'll be taken to the session controls.",
    finishHint: "You'll be taken to the session controls to finish it.",
    notifications: "Notifications",
    noNotifications: "No notifications right now.",
    profile: "My account",
    account: "Account",
    allQuizzes: "All quizzes",
  },
  es: {
    dashboard: "Panel",
    welcomeStart: "Bienvenido a",
    welcomeEnd: "TopGameScore!",
    welcomeDescription:
      "Crea quizzes interactivos para conectar con tu comunidad gamer.",
    createManual: "Crear quiz manual",
    createAI: "Generar quiz con Nyxie (IA)",
    proOnly: "Solo Pro",
    proPlan: "Plan Pro",
    freePlan: "Plan gratis",
    proDescription: "Funciones premium",
    freeDescription: "Empieza gratis",
    quizzesCreated: "Quizzes creados",
    activeGroups: "Grupos activos",
    inactiveGroups: "Grupos inactivos",
    totalGroups: "Total de grupos",
    myQuizzes: "Tus quizzes",
    myQuizzesDescription: "Administra, inicia y sigue tus quizzes.",
    searchPlaceholder: "Buscar quiz...",
    all: "Todos",
    active: "Activo",
    inactive: "Inactivo",
    code: "Código",
    startQuiz: "Iniciar quiz",
    finishQuiz: "Finalizar",
    qrCode: "Código QR",
    moreOptions: "Más opciones",
    manage: "Administrar quiz",
    copyLink: "Copiar enlace completo",
    copied: "¡Enlace copiado!",
    copyFailed: "No se pudo copiar el enlace.",
    openLink: "Abrir enlace de la partida",
    bestPlayer: "Mejor jugador",
    noPlayers: "Todavía no hay jugadores",
    defaultTitle: "Quiz sin título",
    noCode: "Código no disponible",
    loading: "Cargando tus quizzes...",
    loadError: "No se pudieron cargar tus quizzes.",
    retry: "Intentar de nuevo",
    emptyTitle: "Todavía no has creado ningún quiz",
    emptyDescription: "Crea tu primer quiz manualmente o con Nyxie.",
    noResults: "No se encontraron quizzes.",
    logout: "Salir",
    close: "Cerrar",
    qrDescription: "Comparte este código QR con tus jugadores.",
    subscription: "Suscripción",
    subscriptionDescription:
      "Puedes cancelar la renovación y mantener los beneficios hasta el final del período contratado.",
    cancelSubscription: "Cancelar suscripción",
    cancelTitle: "Cancelar suscripción",
    cancelDescription:
      "Tu suscripción finalizará al terminar el período actual. Hasta entonces, conservarás el acceso premium.",
    keepSubscription: "Mantener suscripción",
    confirmCancel: "Sí, cancelar",
    canceling: "Cancelando...",
    cancelSuccess:
      "Suscripción cancelada. Mantendrás el acceso premium hasta el final del período actual.",
    cancelError: "No se pudo cancelar la suscripción.",
    statusLabel: "Estado del quiz",
    startHint: "Accederás a los controles de la partida.",
    finishHint: "Accederás a los controles para finalizarla.",
    notifications: "Notificaciones",
    noNotifications: "No hay notificaciones por ahora.",
    profile: "Mi cuenta",
    account: "Cuenta",
    allQuizzes: "Todos los quizzes",
  },
};

type DashboardCopy = (typeof translations)["pt"];

function useDashboardCopy(): DashboardCopy {
  const { i18n } = useTranslation();

  const language = (i18n.resolvedLanguage || i18n.language || "pt").split(
    "-",
  )[0] as Language;

  return translations[language] || translations.en;
}

function getPlayUrl(code: string) {
  return `${window.location.origin}/play/${encodeURIComponent(code)}`;
}

async function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fallback abaixo.
    }
  }

  const input = document.createElement("textarea");
  input.value = text;
  input.style.position = "fixed";
  input.style.opacity = "0";

  document.body.appendChild(input);
  input.select();

  const copied = document.execCommand("copy");
  document.body.removeChild(input);

  if (!copied) {
    throw new Error("Clipboard copy failed");
  }
}

function getInitial(email?: string | null) {
  return (email?.trim().charAt(0) || "U").toUpperCase();
}

function DashboardGamepad() {
  return (
    <Gamepad2
      className="h-28 w-28 rotate-[-15deg] text-violet-500/20"
      strokeWidth={1.2}
    />
  );
}

export default function DashboardPage() {
  const nav = useNavigate();
  const copy = useDashboardCopy();

  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterValue>("all");

  const [qrZoom, setQrZoom] = useState<Group | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [cancelDlgOpen, setCancelDlgOpen] = useState(false);
  const [cancelDlgBusy, setCancelDlgBusy] = useState(false);

  const [userEmail, setUserEmail] = useState<string | null>(null);

  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { loading: stripeLoading, cancelSubscription } = useStripeUpgrade();

  const { plan, active } = useUserPlan();
  const isPro = plan === "pro" && active;

  useEffect(() => {
    let mounted = true;

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        nav("/");
        return;
      }

      if (!mounted) return;

      setUserEmail(user.email);
      setLoadingGroups(true);
      setLoadError(false);

      try {
        const groupsQuery = query(
          collection(db, "groups"),
          where("hostUid", "==", user.uid),
          orderBy("createdAt", "desc"),
        );

        const snapshot = await getDocs(groupsQuery);

        if (!mounted) return;

        setGroups(
          snapshot.docs.map((document) => ({
            ...document.data(),
            id: document.id,
          })) as Group[],
        );
      } catch (error) {
        console.error("Error loading dashboard groups:", error);

        if (mounted) setLoadError(true);
      } finally {
        if (mounted) setLoadingGroups(false);
      }
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, [nav, reloadKey]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const activeGroups = useMemo(
    () => groups.filter((group) => group.status === "open").length,
    [groups],
  );

  const inactiveGroups = groups.length - activeGroups;

  const filteredGroups = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return groups.filter((group) => {
      const matchesSearch =
        !normalizedSearch ||
        (group.title || "").toLowerCase().includes(normalizedSearch) ||
        (group.code || "").toLowerCase().includes(normalizedSearch);

      const isActive = group.status === "open";

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && isActive) ||
        (statusFilter === "inactive" && !isActive);

      return matchesSearch && matchesStatus;
    });
  }, [groups, searchTerm, statusFilter]);

  async function handleLogout() {
    await signOut(auth);
    nav("/");
  }

  function handleCreateManual() {
    nav("/create?mode=manual");
  }

  function handleCreateAI() {
    nav("/create?mode=ai");
  }

  function handleManage(group: Group) {
    nav(`/host/${group.id}`);
  }

  async function handleCopyLink(group: Group) {
    if (!group.code) return;

    try {
      await copyToClipboard(getPlayUrl(group.code));

      setCopiedCode(group.id);

      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }

      copyTimeoutRef.current = setTimeout(() => {
        setCopiedCode(null);
      }, 2500);
    } catch (error) {
      console.error("Error copying quiz link:", error);
      alert(copy.copyFailed);
    }
  }

  function handleCancelSubscriptionClick() {
    if (!auth.currentUser) return;
    setCancelDlgOpen(true);
  }

  async function handleConfirmCancelSubscription() {
    if (!auth.currentUser) return;

    setCancelDlgBusy(true);

    try {
      const response = await cancelSubscription();

      if (!response.ok) {
        alert(copy.cancelError);
        return;
      }

      alert(copy.cancelSuccess);
      setCancelDlgOpen(false);
    } catch (error) {
      console.error("Error canceling subscription:", error);
      alert(copy.cancelError);
    } finally {
      setCancelDlgBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050b1b] text-white">
      {/* Fundo global */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(ellipse at 4% 0%, rgba(0,225,190,.13), transparent 35%),
            radial-gradient(ellipse at 94% 15%, rgba(125,42,225,.14), transparent 38%),
            radial-gradient(ellipse at 48% 100%, rgba(26,73,170,.10), transparent 40%),
            radial-gradient(circle, rgba(105,153,210,.065) 1px, transparent 1px)
          `,
          backgroundSize: "auto, auto, auto, 22px 22px",
        }}
      />

      {/* TOPBAR */}
      <header className="relative z-30 h-[78px] border-b border-cyan-400/20 bg-[#081225]/70 backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-[18%] top-[-90px] h-[240px] w-[65px] rotate-45 bg-emerald-500/15" />
          <div className="absolute left-[27%] top-[-90px] h-[240px] w-[4px] rotate-45 bg-emerald-400/90 shadow-[0_0_24px_rgba(0,255,180,.5)]" />
          <div className="absolute right-[25%] top-[-100px] h-[260px] w-[160px] rotate-45 bg-violet-600/10" />
          <div className="absolute left-[47%] top-[-35px]">
            <DashboardGamepad />
          </div>
          <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-violet-900/20 to-transparent" />
        </div>

        <div className="relative mx-auto flex h-full max-w-[1580px] items-center justify-between gap-3 px-4 sm:px-7 lg:px-12">
          <button
            type="button"
            onClick={() => nav("/")}
            className="flex shrink-0 items-center"
            aria-label="TopGameScore"
          >
            <img
              src="/logo-top-game-score.png"
              alt="TopGameScore"
              className="h-auto w-40 sm:w-48 lg:w-52"
            />
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className={`hidden items-center gap-2 rounded-xl border px-3 py-2 sm:flex ${
                isPro
                  ? "border-violet-400/40 bg-violet-500/10 text-violet-200"
                  : "border-white/15 bg-white/5 text-slate-200"
              }`}
            >
              <Crown
                className={`h-5 w-5 ${
                  isPro ? "text-violet-400" : "text-slate-400"
                }`}
              />
              <div className="leading-tight">
                <p className="text-xs font-bold">
                  {isPro ? copy.proPlan : copy.freePlan}
                </p>
                <p className="hidden text-[10px] text-slate-400 lg:block">
                  {isPro ? copy.proDescription : copy.freeDescription}
                </p>
              </div>
            </div>

            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>

            {/* Notificações */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotificationsOpen((value) => !value);
                  setProfileOpen(false);
                }}
                title={copy.notifications}
                aria-label={copy.notifications}
                aria-expanded={notificationsOpen}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#101a30]/80 text-slate-200 transition hover:bg-white/10"
              >
                <Bell className="h-5 w-5" />
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-12 z-50 w-64 rounded-xl border border-white/15 bg-[#101b32] p-4 shadow-2xl">
                  <p className="text-sm font-bold">{copy.notifications}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    {copy.noNotifications}
                  </p>
                </div>
              )}
            </div>

            {/* Perfil */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setProfileOpen((value) => !value);
                  setNotificationsOpen(false);
                }}
                aria-label={copy.profile}
                aria-expanded={profileOpen}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#101a30]/80 px-2 py-1.5 transition hover:bg-white/10"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 text-sm font-bold">
                  {getInitial(userEmail)}
                </span>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-12 z-50 w-64 rounded-xl border border-white/15 bg-[#101b32] p-2 shadow-2xl">
                  <div className="border-b border-white/10 px-3 py-3">
                    <p className="text-xs text-slate-400">{copy.account}</p>
                    <p className="mt-1 truncate text-sm font-medium">
                      {userEmail || "—"}
                    </p>
                  </div>

                  <div className="px-2 py-2 sm:hidden">
                    <LanguageSwitcher />
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-red-300 transition hover:bg-red-400/10"
                  >
                    <LogOut className="h-4 w-4" />
                    {copy.logout}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-[1580px] px-4 pb-14 sm:px-7 lg:px-12">
        {/* BANNER */}
        <section className="relative mb-0 min-h-[290px] overflow-hidden pt-8 sm:min-h-[300px] lg:min-h-[275px] lg:pt-9">
          {/* Decoração do banner */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden"
          >
            <div className="absolute -right-24 -top-24 h-[480px] w-[480px] rounded-full bg-violet-700/15 blur-[100px]" />
            <div className="absolute right-[15%] top-[25%] h-[220px] w-[220px] rounded-full bg-cyan-500/10 blur-[75px]" />

            <div className="absolute right-[23%] top-[-100px] h-[650px] w-[110px] rotate-[40deg] bg-emerald-400/10" />
            <div className="absolute right-[27%] top-[-90px] h-[650px] w-[4px] rotate-[40deg] bg-gradient-to-b from-transparent via-emerald-400 to-transparent shadow-[0_0_24px_rgba(0,255,180,.65)]" />

            <div className="absolute -right-20 top-[-120px] h-[650px] w-[150px] rotate-[40deg] bg-violet-500/20" />
            <div className="absolute right-[6%] top-[-100px] h-[600px] w-[4px] rotate-[40deg] bg-gradient-to-b from-transparent via-fuchsia-500 to-transparent shadow-[0_0_28px_rgba(200,40,255,.65)]" />

            <Gamepad2 className="absolute right-[13%] top-7 h-40 w-40 rotate-[-18deg] text-violet-500/10" />
          </div>

          <div className="relative z-10 max-w-[850px]">
            <p className="mb-3 text-sm font-medium text-slate-300">
              {copy.dashboard}
            </p>

            <h1 className="text-[clamp(1.8rem,3.4vw,3rem)] font-black leading-[1.15] tracking-tight">
              {copy.welcomeStart}{" "}
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                {copy.welcomeEnd}
              </span>{" "}
              <span aria-hidden="true">👋</span>
            </h1>

            <p className="mt-3 max-w-[680px] text-sm text-slate-300 sm:text-base lg:text-lg">
              {copy.welcomeDescription}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleCreateManual}
                className="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 px-5 text-sm font-extrabold text-[#041422] shadow-lg shadow-emerald-500/10 transition hover:-translate-y-0.5 hover:brightness-110 sm:px-7 sm:text-base"
              >
                <Plus className="h-5 w-5" />
                {copy.createManual}
              </button>

              <button
                type="button"
                onClick={handleCreateAI}
                className="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl border border-fuchsia-400/80 bg-violet-500/15 px-5 text-sm font-extrabold text-white shadow-lg shadow-violet-500/10 transition hover:-translate-y-0.5 hover:bg-violet-500/25 sm:px-7 sm:text-base"
              >
                <Sparkles className="h-5 w-5 text-fuchsia-400" />
                {copy.createAI}

                {!isPro && <Crown className="h-4 w-4 text-fuchsia-300" />}
              </button>
            </div>
          </div>

          {/* Nyxie — sobreposta ao banner */}
          <img
            src={NYXIE_IMAGE}
            alt="Nyxie, mascote do TopGameScore"
            className="pointer-events-none absolute -bottom-5 right-[-15px] z-0 hidden h-[330px] w-auto max-w-none object-contain object-bottom drop-shadow-[0_0_35px_rgba(0,255,190,.15)] lg:block xl:right-[4%] xl:h-[360px]"
          />
        </section>

        {/* INDICADORES */}
        <section className="relative z-20 mb-9 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <StatCard
            icon={<Gamepad2 className="h-7 w-7" />}
            value={groups.length.toLocaleString()}
            label={copy.quizzesCreated}
            color="emerald"
          />

          <StatCard
            icon={<Users className="h-7 w-7" />}
            value={activeGroups.toLocaleString()}
            label={copy.activeGroups}
            color="violet"
          />

          <StatCard
            icon={<Gamepad2 className="h-7 w-7" />}
            value={inactiveGroups.toLocaleString()}
            label={copy.inactiveGroups}
            color="cyan"
          />

          <StatCard
            icon={<Trophy className="h-7 w-7" />}
            value={groups.length.toLocaleString()}
            label={copy.totalGroups}
            color="amber"
          />
        </section>

        {/* QUIZZES */}
        <section>
          <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div className="flex items-start gap-3">
              <Gamepad2 className="mt-1 h-8 w-8 shrink-0 text-emerald-400" />

              <div>
                <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                  {copy.myQuizzes}
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  {copy.myQuizzesDescription}
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
              <div className="relative w-full sm:w-[290px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={copy.searchPlaceholder}
                  className="h-11 w-full rounded-xl border border-[#334a70] bg-[#10203a]/90 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10"
                />
              </div>

              <div className="relative">
                <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as FilterValue)
                  }
                  className="h-11 w-full min-w-[150px] appearance-none rounded-xl border border-[#334a70] bg-[#10203a]/90 pl-10 pr-9 text-sm font-semibold text-white outline-none transition focus:border-cyan-400/60 sm:w-auto"
                >
                  <option value="all">{copy.all}</option>
                  <option value="active">{copy.active}</option>
                  <option value="inactive">{copy.inactive}</option>
                </select>

                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>

          {loadingGroups ? (
            <div className="rounded-2xl border border-white/10 bg-[#101b31]/80 px-6 py-14 text-center text-sm text-slate-400">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-emerald-400/20 border-t-emerald-400" />
              {copy.loading}
            </div>
          ) : loadError ? (
            <div className="rounded-2xl border border-red-400/20 bg-red-400/5 px-6 py-12 text-center">
              <p className="text-sm text-red-200">{copy.loadError}</p>

              <button
                type="button"
                onClick={() => setReloadKey((value) => value + 1)}
                className="mt-4 rounded-lg bg-slate-800 px-4 py-2 text-sm text-white transition hover:bg-slate-700"
              >
                {copy.retry}
              </button>
            </div>
          ) : groups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-[#101b31]/70 px-6 py-14 text-center">
              <Gamepad2 className="mx-auto mb-4 h-12 w-12 text-emerald-400" />

              <h3 className="text-lg font-bold">{copy.emptyTitle}</h3>

              <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
                {copy.emptyDescription}
              </p>

              <button
                type="button"
                onClick={handleCreateManual}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-5 py-3 text-sm font-bold text-slate-950"
              >
                <Plus className="h-4 w-4" />
                {copy.createManual}
              </button>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#101b31]/70 px-6 py-12 text-center text-slate-400">
              <Search className="mx-auto mb-3 h-8 w-8" />
              {copy.noResults}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredGroups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  copy={copy}
                  copied={copiedCode === group.id}
                  onCopy={() => handleCopyLink(group)}
                  onOpenQR={() => setQrZoom(group)}
                  onManage={() => handleManage(group)}
                  onStart={() => handleManage(group)}
                  onFinish={() => handleManage(group)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Assinatura */}
        {isPro && (
          <section className="mt-12 flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#101a2e]/60 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">
                {copy.subscription}
              </h3>

              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
                {copy.subscriptionDescription}
              </p>
            </div>

            <button
              type="button"
              onClick={handleCancelSubscriptionClick}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-red-400/25 px-3 py-2 text-xs font-medium text-red-300 transition hover:bg-red-400/10"
            >
              <XCircle className="h-4 w-4" />
              {copy.cancelSubscription}
            </button>
          </section>
        )}

        <footer className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} TopGameScore
        </footer>
      </main>

      {/* MODAL QR CODE */}
      {qrZoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setQrZoom(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={copy.qrCode}
            className="w-full max-w-md rounded-3xl border border-cyan-400/20 bg-[#101b30] p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">
                  {qrZoom.title || copy.defaultTitle}
                </h3>

                <p className="mt-1 text-sm text-slate-400">
                  {copy.qrDescription}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setQrZoom(null)}
                aria-label={copy.close}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex justify-center">
              <div className="rounded-2xl bg-white p-4">
                <QRCodeCanvas
                  value={getPlayUrl(qrZoom.code)}
                  size={220}
                  style={{
                    width: "min(65vw, 220px)",
                    height: "auto",
                  }}
                />
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-white/10 bg-[#091225] p-3">
              <p className="mb-2 text-xs text-slate-400">
                {copy.code}:{" "}
                <span className="font-mono font-semibold text-white">
                  {qrZoom.code}
                </span>
              </p>

              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-xs text-cyan-300">
                  {getPlayUrl(qrZoom.code)}
                </span>

                <button
                  type="button"
                  onClick={() => handleCopyLink(qrZoom)}
                  title={copy.copyLink}
                  aria-label={copy.copyLink}
                  className="rounded-lg border border-white/10 bg-white/5 p-2 transition hover:bg-white/10"
                >
                  {copiedCode === qrZoom.id ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setQrZoom(null)}
              className="mt-5 w-full rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-700"
            >
              {copy.close}
            </button>
          </div>
        </div>
      )}

      {/* CANCELAMENTO DE ASSINATURA */}
      <Dialog
        open={cancelDlgOpen}
        onClose={() => {
          if (!cancelDlgBusy) setCancelDlgOpen(false);
        }}
        title={copy.cancelTitle}
        description={
          <div className="space-y-5">
            <p>{copy.cancelDescription}</p>

            <div className="flex flex-col justify-end gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setCancelDlgOpen(false)}
                disabled={cancelDlgBusy}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-100 transition hover:bg-slate-800 disabled:opacity-50"
              >
                {copy.keepSubscription}
              </button>

              <button
                type="button"
                onClick={handleConfirmCancelSubscription}
                disabled={cancelDlgBusy || stripeLoading === "portal"}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
              >
                {cancelDlgBusy ? copy.canceling : copy.confirmCancel}
              </button>
            </div>
          </div>
        }
        variant="warning"
      />
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  color: "emerald" | "violet" | "cyan" | "amber";
}) {
  const colors = {
    emerald: {
      border: "border-emerald-400/25",
      icon: "bg-emerald-400/10 text-emerald-400",
    },
    violet: {
      border: "border-violet-400/25",
      icon: "bg-violet-400/10 text-violet-400",
    },
    cyan: {
      border: "border-cyan-400/25",
      icon: "bg-cyan-400/10 text-cyan-400",
    },
    amber: {
      border: "border-amber-400/25",
      icon: "bg-amber-400/10 text-amber-400",
    },
  };

  const style = colors[color];

  return (
    <div
      className={`flex min-h-[100px] items-center gap-3 rounded-2xl border bg-[#101c34]/90 p-4 shadow-lg shadow-black/10 backdrop-blur-sm sm:gap-4 sm:p-5 ${style.border}`}
    >
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl sm:h-14 sm:w-14 ${style.icon}`}
      >
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-2xl font-black leading-tight sm:text-3xl">{value}</p>

        <p className="mt-1 text-xs text-slate-300 sm:text-sm">{label}</p>
      </div>
    </div>
  );
}

function GroupCard({
  group,
  copy,
  copied,
  onCopy,
  onOpenQR,
  onManage,
  onStart,
  onFinish,
}: {
  group: Group;
  copy: DashboardCopy;
  copied: boolean;
  onCopy: () => void;
  onOpenQR: () => void;
  onManage: () => void;
  onStart: () => void;
  onFinish: () => void;
}) {
  const [winner, setWinner] = useState<Winner | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = group.status === "open";
  const canStart = !group.status || group.status === "draft";
  const canFinish = isActive;

  useEffect(() => {
    let mounted = true;

    async function loadWinner() {
      try {
        const answersSnapshot = await getDocs(
          collection(db, "groups", group.id, "answers"),
        );

        const scores = new Map<string, number>();

        answersSnapshot.forEach((document) => {
          const answer = document.data();
          const playerId = answer.playerId;

          if (!playerId) return;

          const awarded = Number(answer.scoreAwarded ?? 0);

          scores.set(playerId, (scores.get(playerId) ?? 0) + awarded);
        });

        if (scores.size === 0) {
          if (mounted) setWinner(null);
          return;
        }

        const playersSnapshot = await getDocs(
          collection(db, "groups", group.id, "players"),
        );

        const players = new Map(
          playersSnapshot.docs.map((document) => [
            document.id,
            document.data(),
          ]),
        );

        let bestPlayerId = "";
        let bestScore = -Infinity;

        scores.forEach((score, playerId) => {
          if (score > bestScore) {
            bestScore = score;
            bestPlayerId = playerId;
          }
        });

        const player = players.get(bestPlayerId);

        if (mounted) {
          setWinner({
            name: typeof player?.name === "string" ? player.name : "—",
            totalScore: bestScore,
          });
        }
      } catch (error) {
        console.error(`Error loading winner for group ${group.id}:`, error);
      }
    }

    loadWinner();

    return () => {
      mounted = false;
    };
  }, [group.id]);

  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-[#334968] bg-gradient-to-br from-[#14243e]/95 to-[#0d192e]/95 p-4 shadow-lg shadow-black/15 transition duration-200 hover:-translate-y-0.5 hover:border-cyan-400/40 hover:shadow-cyan-500/5 sm:p-5">
      {/* Título e status */}
      <div className="mb-2 flex items-start justify-between gap-3">
        <h3
          className="min-w-0 truncate text-base font-extrabold text-white sm:text-lg"
          title={group.title}
        >
          {group.title || copy.defaultTitle}
        </h3>

        <span
          className={`mt-1 h-3 w-3 shrink-0 rounded-full ${
            isActive
              ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.6)]"
              : "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,.4)]"
          }`}
          title={isActive ? copy.active : copy.inactive}
          aria-label={`${copy.statusLabel}: ${
            isActive ? copy.active : copy.inactive
          }`}
        />
      </div>

      {/* Código */}
      <div className="flex items-center gap-2">
        <p className="min-w-0 truncate text-xs text-slate-300">
          {copy.code}:{" "}
          <span className="font-mono text-slate-200">
            {group.code || copy.noCode}
          </span>
        </p>

        <button
          type="button"
          onClick={onCopy}
          disabled={!group.code}
          title={copied ? copy.copied : copy.copyLink}
          aria-label={copied ? copy.copied : copy.copyLink}
          className="shrink-0 rounded-md p-1 text-slate-300 transition hover:bg-white/10 hover:text-cyan-300 disabled:opacity-40"
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-400" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Link */}
      {group.code && (
        <a
          href={getPlayUrl(group.code)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 block truncate text-xs text-[#75b9ff] underline underline-offset-2 transition hover:text-cyan-300"
          title={getPlayUrl(group.code)}
        >
          {getPlayUrl(group.code)}
        </a>
      )}

      {/* Jogador com maior pontuação */}
      <div className="mb-4 mt-3 flex min-w-0 items-center gap-2">
        <Trophy className="h-4 w-4 shrink-0 text-amber-400" />

        <span className="min-w-0 truncate text-xs text-slate-300">
          {copy.bestPlayer}:{" "}
          <strong className="font-semibold text-white">
            {winner?.name || copy.noPlayers}
          </strong>
        </span>

        {winner && (
          <span className="ml-auto shrink-0 font-mono text-xs font-bold text-emerald-400">
            {winner.totalScore}
          </span>
        )}
      </div>

      {/* Ações */}
      <div className="mt-auto flex flex-wrap items-center gap-2">
        {canStart && (
          <button
            type="button"
            onClick={onStart}
            title={copy.startHint}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-3 text-xs font-extrabold text-slate-950 transition hover:brightness-110 sm:text-sm"
          >
            <Play className="h-4 w-4 fill-current" />
            <span className="whitespace-nowrap">{copy.startQuiz}</span>
          </button>
        )}

        {canFinish && (
          <button
            type="button"
            onClick={onFinish}
            title={copy.finishHint}
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#526582] bg-[#101d32] px-3 text-xs font-semibold text-slate-100 transition hover:border-red-400/50 hover:bg-red-400/10"
          >
            <Flag className="h-4 w-4" />
            <span>{copy.finishQuiz}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenQR}
          disabled={!group.code}
          title={copy.qrCode}
          aria-label={copy.qrCode}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#526582] bg-[#101d32] px-3 text-xs font-semibold text-slate-100 transition hover:border-cyan-400/50 hover:bg-cyan-400/10 disabled:opacity-40"
        >
          <QrCode className="h-4 w-4" />
          <span className="hidden 2xl:inline">{copy.qrCode}</span>
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            title={copy.moreOptions}
            aria-label={copy.moreOptions}
            aria-expanded={menuOpen}
            className="flex h-10 w-9 items-center justify-center rounded-xl border border-[#526582] bg-[#101d32] text-slate-200 transition hover:bg-white/10"
          >
            <EllipsisVertical className="h-4 w-4" />
          </button>

          {menuOpen && (
            <div className="absolute bottom-12 right-0 z-30 w-52 rounded-xl border border-white/15 bg-[#14213a] p-1.5 shadow-2xl">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onManage();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-200 transition hover:bg-white/10"
              >
                <Gamepad2 className="h-4 w-4" />
                {copy.manage}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onCopy();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-200 transition hover:bg-white/10"
              >
                <Copy className="h-4 w-4" />
                {copy.copyLink}
              </button>

              {group.code && (
                <a
                  href={getPlayUrl(group.code)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-200 transition hover:bg-white/10"
                >
                  <ArrowRight className="h-4 w-4" />
                  {copy.openLink}
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {copied && (
        <p
          role="status"
          className="mt-2 text-xs font-semibold text-emerald-400"
        >
          {copy.copied}
        </p>
      )}
    </article>
  );
}
