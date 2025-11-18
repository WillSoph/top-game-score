import { useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Plus, XCircle, LogOut as LogOutIcon } from "lucide-react";
import { useStripeUpgrade } from "../hooks/useStripeUpgrade";
import Dialog from "../components/ui/dialog";
import { useUserPlan } from "../hooks/useUserPlan";

type Group = {
  id: string;
  code: string;
  title: string;
  createdAt?: any;
  // status?: string; // existe no Firestore, mas mantive como opcional
};

export default function DashboardPage() {
  const nav = useNavigate();
  const { t } = useTranslation();
  const [groups, setGroups] = useState<Group[]>([]);
  const [qrZoom, setQrZoom] = useState<Group | null>(null);
  const playBase = `${window.location.origin}/play/`;

  const { loading: stripeLoading, cancelSubscription } = useStripeUpgrade();
  const { plan, active } = useUserPlan();
  const isPro = plan === "pro" && active;

  // === Dialog de confirmação de cancelamento ===
  const [cancelDlgOpen, setCancelDlgOpen] = useState(false);
  const [cancelDlgBusy, setCancelDlgBusy] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        nav("/");
        return;
      }
      const q = query(
        collection(db, "groups"),
        where("hostUid", "==", u.uid),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      setGroups(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Group[]
      );
    });
    return () => unsub();
  }, [nav]);

  async function handleLogout() {
    await signOut(auth);
    nav("/");
  }

  // Abre modal de confirmação de cancelamento
  function handleCancelSubscriptionClick() {
    if (!auth.currentUser) {
      return;
    }
    setCancelDlgOpen(true);
  }

  // Confirma cancelamento
  async function handleConfirmCancelSubscription() {
    if (!auth.currentUser) return;

    setCancelDlgBusy(true);
    try {
      const res = await cancelSubscription();

      if (!res.ok) {
        alert(t("pricing.error"));
        return;
      }

      alert(
        t(
          "billing.cancelDialog.success",
          "Assinatura cancelada. Você poderá continuar usufruindo do serviço premium até o fim do período atual."
        )
      );

      setCancelDlgOpen(false);
    } finally {
      setCancelDlgBusy(false);
    }
  }

  // Resumo
  const totalGroups = groups.length;
  const activeGroups = groups.filter(
    (g: any) => g.status === "open"
  ).length;

  return (
    <div className="min-h-screen pb-safe pt-safe bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,.20),transparent_40%),radial-gradient(ellipse_at_bottom_right,rgba(59,130,246,.18),transparent_40%)]">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 md:px-10 py-5 sm:py-8 md:py-10 space-y-6 sm:space-y-8">
        {/* HEADER CARD */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-sm px-4 py-4 sm:px-6 sm:py-5 shadow-xl space-y-4">
          {/* Row 1: back + título + badge de plano */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => (window.history.length > 1 ? nav(-1) : nav("/"))}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 transition"
                aria-label={t("common.back")}
                title={t("common.back")}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="text-sm">{t("common.back")}</span>
              </button>

              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-100 tracking-tight">
                TopGameScore
              </h1>
            </div>

            {/* Badge de plano */}
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                isPro
                  ? "bg-emerald-600/90 text-white"
                  : "bg-slate-800 border border-slate-700 text-slate-100"
              }`}
              title={
                isPro
                  ? t("create.limit.badge.pro", {
                      defaultValue: "Plano Pro — perguntas ilimitadas",
                    })
                  : t("create.limit.badge.free", {
                      defaultValue: "Plano Grátis — até 10 perguntas",
                    })
              }
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              {isPro
                ? t("create.limit.badge.pro", { defaultValue: "Pro ativo" })
                : t("create.limit.badge.free", { defaultValue: "Plano grátis" })}
            </span>
          </div>

          {/* Row 2: ações principais */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            {/* Criar quiz */}
            <button
              onClick={() => nav("/create")}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-semibold shadow-sm hover:opacity-90 transition"
              aria-label={t("dashboard.actions.newQuizAria")}
              title={t("dashboard.actions.newQuizAria")}
            >
              <Plus className="h-4 w-4" />
              <span>{t("dashboard.actions.newQuiz")}</span>
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 text-slate-100 font-medium hover:bg-slate-700 transition"
              aria-label={t("dashboard.actions.logoutAria")}
              title={t("dashboard.actions.logoutAria")}
            >
              <LogOutIcon className="h-4 w-4" />
              <span>{t("dashboard.actions.logout")}</span>
            </button>
          </div>

          {/* Row 3: resumo de grupos */}
          <div className="mt-2 pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-sm text-slate-300">
              {t("dashboard.summary.text", {
                defaultValue:
                  "Você tem {{total}} grupo(s) e {{active}} ativo(s) hoje.",
                total: totalGroups,
                active: activeGroups,
              })}
            </p>
            {totalGroups > 0 && (
              <p className="text-xs text-slate-400">
                {t("dashboard.summary.hint", {
                  defaultValue:
                    "Abra um grupo para ver o ranking em tempo real.",
                })}
              </p>
            )}
          </div>
        </div>

        {/* LISTA DE QUIZZES */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm shadow-xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-100">
              {t("dashboard.groups.title", "Seus grupos")}
            </h2>
            {groups.length > 0 && (
              <span className="text-xs sm:text-sm text-slate-400">
                {t("dashboard.groups.count", {
                  defaultValue: "{{count}} grupo(s)",
                  count: groups.length,
                })}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {groups.map((g) => (
              <GroupCard
                key={g.id}
                group={g}
                playUrl={`${playBase}${g.code}`}
                onOpenQR={() => setQrZoom(g)}
                onOpenHost={() => nav(`/host/${g.id}`)}
              />
            ))}

            {groups.length === 0 && (
              <div className="col-span-full text-center py-10 text-slate-400 italic border border-dashed border-slate-700 rounded-xl bg-slate-900/40">
                {t("dashboard.empty.line1")}
                <br />
                <span className="text-indigo-400 not-italic">
                  {t("dashboard.empty.line2")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER COM CANCELAR ASSINATURA */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm px-4 py-3 sm:px-6 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-xs sm:text-sm text-slate-400">
            <p>
              {t(
                "billing.footer.text",
                "Precisa encerrar sua assinatura? Você continuará com acesso premium até o fim do período atual."
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCancelSubscriptionClick}
            className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border border-red-500/70 text-red-200 hover:bg-red-600/10 text-xs sm:text-sm font-medium transition"
            aria-label={t("billing.cancel")}
            title={t("billing.cancel")}
          >
            <XCircle className="h-4 w-4" />
            <span>{t("billing.cancel")}</span>
          </button>
        </div>

        {/* QR Modal */}
        {qrZoom && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-4 flex items-center justify-center">
            <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-xl p-5 sm:p-6 text-center">
              <h3 className="font-semibold text-lg sm:text-xl text-slate-100 mb-3">
                {t("dashboard.qr.title", {
                  label: qrZoom.title || qrZoom.code,
                })}
              </h3>

              <div className="mx-auto inline-block">
                <QRCodeCanvas
                  value={`${playBase}${qrZoom.code}`}
                  size={220}
                  style={{ width: "min(80vw, 220px)", height: "auto" }}
                />
              </div>

              <a
                className="mt-4 block text-indigo-400 hover:underline break-all"
                href={`${playBase}${qrZoom.code}`}
                target="_blank"
                rel="noreferrer"
              >
                {playBase}
                {qrZoom.code}
              </a>

              <button
                onClick={() => setQrZoom(null)}
                className="mt-5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition text-sm"
              >
                {t("dashboard.qr.close")}
              </button>
            </div>
          </div>
        )}

        {/* Dialog de confirmação de cancelamento */}
        <Dialog
          open={cancelDlgOpen}
          onClose={() => {
            if (!cancelDlgBusy) setCancelDlgOpen(false);
          }}
          title={t("billing.cancelDialog.title", "Cancelar assinatura")}
          description={
            <div className="space-y-4">
              <p>
                {t(
                  "billing.cancelDialog.text",
                  "Ao cancelar, sua assinatura será encerrada ao fim do período atual. Até lá, você continuará com acesso premium."
                )}
              </p>
              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg border border-slate-600 text-sm text-slate-100 hover:bg-slate-800 transition"
                  onClick={() => setCancelDlgOpen(false)}
                  disabled={cancelDlgBusy}
                >
                  {t("common.noKeep", "Manter assinatura")}
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-sm text-white disabled:opacity-60 transition"
                  onClick={handleConfirmCancelSubscription}
                  disabled={cancelDlgBusy || stripeLoading === "portal"}
                >
                  {cancelDlgBusy || stripeLoading === "portal"
                    ? t("common.loading", "Cancelando…")
                    : t(
                        "billing.cancelDialog.confirm",
                        "Sim, cancelar"
                      )}
                </button>
              </div>
            </div>
          }
          variant="warning"
        />
      </div>
    </div>
  );
}

/* ---------------------- Subcomponent: GroupCard ---------------------- */

function GroupCard({
  group,
  playUrl,
  onOpenQR,
  onOpenHost,
}: {
  group: Group;
  playUrl: string;
  onOpenQR: () => void;
  onOpenHost: () => void;
}) {
  const { t } = useTranslation();
  const [winner, setWinner] = useState<{ name: string; totalScore: number } | null>(
    null
  );

  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "groups", group.id, "answers"));
      const byPlayer = new Map<string, number>();
      snap.forEach((doc) => {
        const a = doc.data() as any;
        byPlayer.set(
          a.playerId,
          (byPlayer.get(a.playerId) ?? 0) + (a.scoreAwarded ?? 0)
        );
      });
      if (byPlayer.size === 0) return;

      const playersSnap = await getDocs(
        collection(db, "groups", group.id, "players")
      );
      const players = new Map(
        playersSnap.docs.map((d) => [d.id, d.data() as any])
      );

      let bestId = "";
      let bestScore = -1;
      byPlayer.forEach((score, id) => {
        if (score > bestScore) {
          bestScore = score;
          bestId = id;
        }
      });
      const p = players.get(bestId);
      setWinner({
        name: p?.name || t("dashboard.group.playerFallback"),
        totalScore: bestScore,
      });
    })();
  }, [group.id, t]);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-lg hover:border-indigo-500 transition-all duration-200 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-base sm:text-lg text-slate-100 truncate">
            {group.title || t("dashboard.group.defaultQuizTitle")}
          </div>
          <div className="text-xs text-slate-500">
            {t("dashboard.group.codeLabel", { code: group.code })}
          </div>
        </div>
        <button
          onClick={onOpenQR}
          className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-xs text-slate-100"
          aria-label={t("dashboard.qr.showAria")}
          title={t("dashboard.qr.showAria")}
        >
          {t("dashboard.qr.show")}
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 text-sm">
        <a
          className="text-indigo-400 underline truncate hover:text-indigo-300 max-w-[70%]"
          href={playUrl}
          target="_blank"
          rel="noreferrer"
          title={playUrl}
        >
          {playUrl}
        </a>
        <button
          onClick={onOpenHost}
          className="px-3 py-1.5 rounded-md bg-emerald-700 hover:bg-emerald-600 text-sm font-medium text-white transition"
        >
          {t("dashboard.group.manage")}
        </button>
      </div>

      <div className="text-sm mt-2">
        <div className="text-slate-400 mb-1">
          {t("dashboard.group.topPlayer")}
        </div>
        {winner ? (
          <div className="flex justify-between text-slate-200">
            <span className="truncate">{winner.name}</span>
            <span className="font-mono text-emerald-400">
              {winner.totalScore}
            </span>
          </div>
        ) : (
          <div className="italic text-slate-500">
            {t("dashboard.group.noPlayers")}
          </div>
        )}
      </div>
    </div>
  );
}
