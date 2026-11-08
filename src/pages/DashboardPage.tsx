import { useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  Copy,
  Crown,
  Gamepad2,
  LogOut,
  Plus,
  QrCode,
  Sparkles,
  Trophy,
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

const translations = {
  pt: {
    dashboard: "Meu painel",
    subtitle: "Gerencie seus quizzes e suas partidas em um só lugar.",
    createTitle: "Criar novo quiz",
    createDescription: "Escolha como deseja preparar sua próxima partida.",
    manualTitle: "Criar manualmente",
    manualDescription: "Monte suas perguntas e respostas do seu jeito.",
    aiTitle: "Gerar com a Nyxie",
    aiDescription:
      "Deixe a inteligência artificial criar seu quiz em segundos.",
    manualAction: "Criar quiz",
    aiAction: "Gerar com IA",
    proOnly: "Exclusivo Pro",
    myQuizzes: "Meus quizzes",
    quizCount: "quizzes",
    active: "Ativo",
    inactive: "Inativo",
    code: "Código",
    copyLink: "Copiar link da partida",
    copied: "Link copiado!",
    copyFailed: "Não foi possível copiar o link.",
    qrCode: "QR Code",
    manage: "Gerenciar",
    bestPlayer: "Melhor jogador",
    noPlayers: "Nenhum jogador ainda",
    defaultTitle: "Quiz sem título",
    emptyTitle: "Você ainda não criou nenhum quiz",
    emptyDescription:
      "Comece criando seu primeiro quiz manualmente ou com a ajuda da Nyxie.",
    loading: "Carregando seus quizzes...",
    loadError: "Não foi possível carregar seus quizzes.",
    retry: "Tentar novamente",
    logout: "Sair",
    back: "Voltar",
    freePlan: "Plano grátis",
    proPlan: "Plano Pro",
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
    aiPlanHint: "Disponível no plano Pro",
    statusLabel: "Status do quiz",
    noCode: "Código indisponível",
  },
  en: {
    dashboard: "My dashboard",
    subtitle: "Manage your quizzes and live sessions in one place.",
    createTitle: "Create a new quiz",
    createDescription: "Choose how to prepare your next session.",
    manualTitle: "Create manually",
    manualDescription: "Build your own questions and answers.",
    aiTitle: "Generate with Nyxie",
    aiDescription: "Let AI create your quiz in seconds.",
    manualAction: "Create quiz",
    aiAction: "Generate with AI",
    proOnly: "Pro only",
    myQuizzes: "My quizzes",
    quizCount: "quizzes",
    active: "Active",
    inactive: "Inactive",
    code: "Code",
    copyLink: "Copy session link",
    copied: "Link copied!",
    copyFailed: "Could not copy the link.",
    qrCode: "QR Code",
    manage: "Manage",
    bestPlayer: "Top player",
    noPlayers: "No players yet",
    defaultTitle: "Untitled quiz",
    emptyTitle: "You haven't created any quizzes yet",
    emptyDescription:
      "Start by creating your first quiz manually or with Nyxie's help.",
    loading: "Loading your quizzes...",
    loadError: "Could not load your quizzes.",
    retry: "Try again",
    logout: "Log out",
    back: "Back",
    freePlan: "Free plan",
    proPlan: "Pro plan",
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
    aiPlanHint: "Available on the Pro plan",
    statusLabel: "Quiz status",
    noCode: "Code unavailable",
  },
  es: {
    dashboard: "Mi panel",
    subtitle: "Administra tus quizzes y partidas en un solo lugar.",
    createTitle: "Crear un nuevo quiz",
    createDescription: "Elige cómo preparar tu próxima partida.",
    manualTitle: "Crear manualmente",
    manualDescription: "Crea tus propias preguntas y respuestas.",
    aiTitle: "Generar con Nyxie",
    aiDescription: "Deja que la IA cree tu quiz en segundos.",
    manualAction: "Crear quiz",
    aiAction: "Generar con IA",
    proOnly: "Solo Pro",
    myQuizzes: "Mis quizzes",
    quizCount: "quizzes",
    active: "Activo",
    inactive: "Inactivo",
    code: "Código",
    copyLink: "Copiar enlace de la partida",
    copied: "¡Enlace copiado!",
    copyFailed: "No se pudo copiar el enlace.",
    qrCode: "Código QR",
    manage: "Administrar",
    bestPlayer: "Mejor jugador",
    noPlayers: "Todavía no hay jugadores",
    defaultTitle: "Quiz sin título",
    emptyTitle: "Todavía no has creado ningún quiz",
    emptyDescription:
      "Comienza creando tu primer quiz manualmente o con la ayuda de Nyxie.",
    loading: "Cargando tus quizzes...",
    loadError: "No se pudieron cargar tus quizzes.",
    retry: "Intentar de nuevo",
    logout: "Salir",
    back: "Volver",
    freePlan: "Plan gratis",
    proPlan: "Plan Pro",
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
    aiPlanHint: "Disponible en el plan Pro",
    statusLabel: "Estado del quiz",
    noCode: "Código no disponible",
  },
};

function useDashboardCopy() {
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
      // Tenta o método alternativo abaixo.
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

export default function DashboardPage() {
  const nav = useNavigate();
  const copy = useDashboardCopy();

  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [qrZoom, setQrZoom] = useState<Group | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [cancelDlgOpen, setCancelDlgOpen] = useState(false);
  const [cancelDlgBusy, setCancelDlgBusy] = useState(false);

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

        if (mounted) {
          setLoadError(true);
        }
      } finally {
        if (mounted) {
          setLoadingGroups(false);
        }
      }
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, [nav, reloadKey]);

  const activeGroups = groups.filter((group) => group.status === "open").length;

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

  async function handleCopyLink(group: Group) {
    if (!group.code) return;

    try {
      await copyToClipboard(getPlayUrl(group.code));
      setCopiedCode(group.id);

      window.setTimeout(() => {
        setCopiedCode((current) => (current === group.id ? null : current));
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
    <div className="relative min-h-screen overflow-hidden bg-[#070d1c] text-white">
      {/* Background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(ellipse at 8% 4%, rgba(0, 222, 169, 0.12), transparent 35%),
            radial-gradient(ellipse at 96% 20%, rgba(112, 48, 221, 0.13), transparent 36%),
            radial-gradient(circle, rgba(125, 160, 210, 0.065) 1px, transparent 1px)
          `,
          backgroundSize: "auto, auto, 22px 22px",
        }}
      />

      <div className="relative mx-auto w-full max-w-[1380px] px-4 pb-16 pt-5 sm:px-6 lg:px-10">
        {/* Header */}
        <header className="mb-8 rounded-2xl border border-white/10 bg-[#101a2e]/75 px-4 py-4 shadow-xl shadow-black/10 backdrop-blur-xl sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => nav("/")}
              className="flex shrink-0 items-center"
              aria-label="TopGameScore"
            >
              <img
                src="/logo-top-game-score.png"
                alt="TopGameScore"
                className="h-auto w-40 sm:w-48"
              />
            </button>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  isPro
                    ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
                    : "border-slate-600/50 bg-slate-800/70 text-slate-300"
                }`}
              >
                {isPro ? (
                  <Crown className="h-3.5 w-3.5" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                )}
                {isPro ? copy.proPlan : copy.freePlan}
              </span>

              <LanguageSwitcher />

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">{copy.logout}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Welcome */}
        <div className="mb-7">
          <button
            type="button"
            onClick={() => nav("/")}
            className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-slate-400 transition hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            {copy.back}
          </button>

          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            {copy.dashboard}
          </h1>

          <p className="mt-2 text-sm text-slate-400 sm:text-base">
            {copy.subtitle}
          </p>
        </div>

        {/* Create quiz */}
        <section className="mb-9">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-white sm:text-xl">
              {copy.createTitle}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {copy.createDescription}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Manual */}
            <button
              type="button"
              onClick={handleCreateManual}
              className="group relative overflow-hidden rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-[#102a30] via-[#10232c] to-[#101b2d] p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-emerald-400/50 hover:shadow-lg hover:shadow-emerald-500/10 sm:p-6"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-14 -top-16 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl"
              />

              <div className="relative flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                  <Plus className="h-6 w-6" />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold text-white">
                    {copy.manualTitle}
                  </h3>

                  <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                    {copy.manualDescription}
                  </p>

                  <span className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-950 transition group-hover:brightness-110">
                    <Gamepad2 className="h-4 w-4" />
                    {copy.manualAction}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </button>

            {/* AI */}
            <button
              type="button"
              onClick={handleCreateAI}
              className="group relative overflow-hidden rounded-2xl border border-violet-400/25 bg-gradient-to-br from-[#2a1944] via-[#211a3c] to-[#111a31] p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-violet-400/55 hover:shadow-lg hover:shadow-violet-500/10 sm:p-6"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-violet-500/20 blur-3xl"
              />

              <div className="relative flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-violet-400/25 bg-violet-400/15 text-violet-300">
                  <Sparkles className="h-6 w-6" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-white">
                      {copy.aiTitle}
                    </h3>

                    {!isPro && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/25 bg-violet-400/15 px-2 py-0.5 text-[10px] font-bold text-violet-200">
                        <Crown className="h-3 w-3" />
                        {copy.proOnly}
                      </span>
                    )}
                  </div>

                  <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                    {copy.aiDescription}
                  </p>

                  <span className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2.5 text-sm font-bold text-white transition group-hover:brightness-110">
                    <Sparkles className="h-4 w-4" />
                    {copy.aiAction}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </button>
          </div>
        </section>

        {/* Quiz list */}
        <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white sm:text-xl">
                {copy.myQuizzes}
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                {groups.length} {copy.quizCount}
                {activeGroups > 0 && (
                  <span className="ml-2 text-emerald-400">
                    · {activeGroups} {copy.active.toLowerCase()}
                  </span>
                )}
              </p>
            </div>
          </div>

          {loadingGroups ? (
            <div className="rounded-2xl border border-white/10 bg-[#101a2e]/70 px-6 py-14 text-center text-sm text-slate-400">
              <div className="mx-auto mb-4 h-7 w-7 animate-spin rounded-full border-2 border-emerald-400/20 border-t-emerald-400" />
              {copy.loading}
            </div>
          ) : loadError ? (
            <div className="rounded-2xl border border-red-400/20 bg-red-400/5 px-6 py-10 text-center">
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
            <div className="rounded-2xl border border-dashed border-white/15 bg-[#101a2e]/60 px-6 py-14 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-400">
                <Gamepad2 className="h-7 w-7" />
              </div>

              <h3 className="font-semibold text-white">{copy.emptyTitle}</h3>

              <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
                {copy.emptyDescription}
              </p>

              <button
                type="button"
                onClick={handleCreateManual}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-300"
              >
                <Plus className="h-4 w-4" />
                {copy.manualAction}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {groups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  copy={copy}
                  copied={copiedCode === group.id}
                  onCopy={() => handleCopyLink(group)}
                  onOpenQR={() => setQrZoom(group)}
                  onManage={() => nav(`/host/${group.id}`)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Subscription management */}
        {isPro && (
          <div className="mt-12 flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#101a2e]/50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
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
          </div>
        )}

        <footer className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} TopGameScore
        </footer>
      </div>

      {/* QR modal */}
      {qrZoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
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
            className="w-full max-w-md rounded-3xl border border-white/15 bg-[#111b30] p-5 shadow-2xl sm:p-7"
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white">
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
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
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

            <div className="mt-5 rounded-xl border border-white/10 bg-[#0a1324] p-3">
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
                  className="rounded-lg border border-white/10 bg-white/5 p-2 text-white transition hover:bg-white/10"
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
              className="mt-5 w-full rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              {copy.close}
            </button>
          </div>
        </div>
      )}

      {/* Subscription confirmation */}
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

function GroupCard({
  group,
  copy,
  copied,
  onCopy,
  onOpenQR,
  onManage,
}: {
  group: Group;
  copy: (typeof translations)["pt"];
  copied: boolean;
  onCopy: () => void;
  onOpenQR: () => void;
  onManage: () => void;
}) {
  const [winner, setWinner] = useState<Winner | null>(null);

  const isActive = group.status === "open";

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
    <article className="group relative flex h-full flex-col rounded-2xl border border-white/10 bg-[#111b30]/85 p-5 shadow-lg shadow-black/10 transition duration-200 hover:-translate-y-0.5 hover:border-cyan-400/30 hover:shadow-cyan-500/5">
      {/* Title and status */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            className="truncate text-base font-bold text-white"
            title={group.title}
          >
            {group.title || copy.defaultTitle}
          </h3>
        </div>

        <div
          className="flex shrink-0 items-center gap-1.5"
          title={`${copy.statusLabel}: ${
            isActive ? copy.active : copy.inactive
          }`}
          aria-label={`${copy.statusLabel}: ${
            isActive ? copy.active : copy.inactive
          }`}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              isActive
                ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.55)]"
                : "bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.3)]"
            }`}
          />

          <span
            className={`text-[11px] font-medium ${
              isActive ? "text-emerald-300" : "text-slate-400"
            }`}
          >
            {isActive ? copy.active : copy.inactive}
          </span>
        </div>
      </div>

      {/* Code and copy */}
      <div className="rounded-xl border border-white/5 bg-[#0b1426] px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-1 text-[11px] text-slate-500">{copy.code}</p>

            <p className="truncate font-mono text-sm font-semibold tracking-wide text-slate-200">
              {group.code || copy.noCode}
            </p>
          </div>

          <button
            type="button"
            onClick={onCopy}
            disabled={!group.code}
            title={copied ? copy.copied : copy.copyLink}
            aria-label={copied ? copy.copied : copy.copyLink}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-40 ${
              copied
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                : "border-white/10 bg-white/5 text-slate-300 hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-cyan-300"
            }`}
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>

        {copied && (
          <p
            role="status"
            className="mt-2 text-xs font-medium text-emerald-300"
          >
            {copy.copied}
          </p>
        )}
      </div>

      {/* Winner */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Trophy className="h-4 w-4 shrink-0 text-amber-400" />

          <div className="min-w-0">
            <p className="text-[11px] text-slate-500">{copy.bestPlayer}</p>

            <p className="truncate text-sm font-medium text-slate-200">
              {winner?.name || copy.noPlayers}
            </p>
          </div>
        </div>

        {winner && (
          <span className="shrink-0 font-mono text-sm font-bold text-emerald-400">
            {winner.totalScore}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="mt-auto flex items-center gap-2 border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={onOpenQR}
          disabled={!group.code}
          title={copy.qrCode}
          aria-label={copy.qrCode}
          className="inline-flex h-10 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-cyan-300 disabled:opacity-40"
        >
          <QrCode className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={onManage}
          className="inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 text-sm font-bold text-slate-950 transition hover:brightness-110"
        >
          {copy.manage}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}
