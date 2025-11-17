import { useEffect, useState, useMemo } from "react";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import Dialog from "../components/ui/dialog";
import { useNavigate } from "react-router-dom";

type AdminConfig = {
  adminUid: string;
  name: string;
  email: string;
};

type GroupAdminView = {
  id: string;
  title: string;
  code: string;
  hostUid: string;
  hostName?: string | null;
  hostEmail?: string | null;
  plan?: "free" | "pro";
  createdAt?: Date | null;
};

type Mode = "loading" | "setup" | "login" | "dashboard";

export default function AdminPage() {
  const nav = useNavigate();

  const [mode, setMode] = useState<Mode>("loading");
  const [adminConfig, setAdminConfig] = useState<AdminConfig | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Forms
  const [setupName, setSetupName] = useState("");
  const [setupEmail, setSetupEmail] = useState("");
  const [setupPassword, setSetupPassword] = useState("");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Tabela de grupos
  const [groups, setGroups] = useState<GroupAdminView[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);

  // Dialog de confirmação de exclusão
  const [deleteTarget, setDeleteTarget] = useState<GroupAdminView | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Dialog genérico de feedback
  const [dlgOpen, setDlgOpen] = useState(false);
  const [dlgTitle, setDlgTitle] = useState("");
  const [dlgMsg, setDlgMsg] = useState<React.ReactNode>("");
  const [dlgVariant, setDlgVariant] = useState<"info" | "success" | "warning" | "danger">(
    "info"
  );

  function openDialog(
    title: string,
    msg: React.ReactNode,
    variant: "info" | "success" | "warning" | "danger" = "info"
  ) {
    setDlgTitle(title);
    setDlgMsg(msg);
    setDlgVariant(variant);
    setDlgOpen(true);
  }

  // ============================
  // Auth listener
  // ============================

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setCurrentUser(u);
    });
    return () => unsub();
  }, []);

  // ============================
  // Carrega config/admin
  // ============================

  useEffect(() => {
    async function loadAdminConfig() {
      try {
        const snap = await getDoc(doc(db, "config", "admin"));
        if (snap.exists()) {
          const data = snap.data() as any;
          setAdminConfig({
            adminUid: data.adminUid,
            name: data.name,
            email: data.email,
          });
        } else {
          console.log("[admin] config/admin ainda não existe");
          setAdminConfig(null);
        }
      } catch (err) {
        console.error("[admin] erro ao ler config/admin:", err);
        setAdminConfig(null);
      }
    }
    loadAdminConfig();
  }, []);

  // ============================
  // Decide o modo com base em adminConfig + currentUser
  // ============================

  useEffect(() => {
    if (adminConfig === null) {
      setMode("setup");
      return;
    }

    if (!currentUser) {
      setMode("login");
      return;
    }

    if (currentUser.uid === adminConfig.adminUid) {
      setMode("dashboard");
      return;
    }

    // usuário logado mas não é o admin → desloga por segurança
    signOut(auth).finally(() => {
      setMode("login");
    });
  }, [adminConfig, currentUser]);

  // ============================
  // Carregar grupos quando entrar no modo dashboard
  // ============================

  useEffect(() => {
    if (mode !== "dashboard") return;
    loadGroups();
  }, [mode]);

  async function loadGroups() {
    setGroupsLoading(true);
    try {
      const q = query(collection(db, "groups"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);

      const list: GroupAdminView[] = snap.docs.map((d) => {
        const data = d.data() as any;
        const plan = (data.plan ?? data.billingPlan) as "free" | "pro" | undefined;

        return {
          id: d.id,
          title: data.title || "(sem título)",
          code: data.code,
          hostUid: data.hostUid,
          hostName: data.hostName ?? null,
          hostEmail: data.hostEmail ?? null,
          plan,
          createdAt: data.createdAt?.toDate?.() ?? null,
        };
      });

      setGroups(list);
    } catch (err) {
      console.error("Failed to load groups", err);
      openDialog(
        "Erro",
        "Não foi possível carregar os grupos. Tente novamente mais tarde.",
        "danger"
      );
    } finally {
      setGroupsLoading(false);
    }
  }

  // ============================
  // Métricas para os cards
  // ============================

  const stats = useMemo(() => {
    const total = groups.length;
    const premium = groups.filter((g) => g.plan === "pro").length;
    const free = total - premium;

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const last7days = groups.filter(
      (g) => g.createdAt && g.createdAt.getTime() >= sevenDaysAgo
    ).length;

    return { total, premium, free, last7days };
  }, [groups]);

  // ============================
  // Setup inicial do admin
  // ============================

  async function handleSetupAdmin(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const name = setupName.trim();
    const email = setupEmail.trim();
    const password = setupPassword;

    if (!name || !email || !password) {
      setFormError("Preencha nome, email e senha.");
      return;
    }

    setBusy(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);

      await updateProfile(cred.user, { displayName: name });

      await setDoc(
        doc(db, "config", "admin"),
        {
          adminUid: cred.user.uid,
          name,
          email,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

      setAdminConfig({
        adminUid: cred.user.uid,
        name,
        email,
      });

      openDialog("Sucesso", "Usuário admin criado com sucesso.", "success");
      setMode("dashboard");
    } catch (err: any) {
      console.error("handleSetupAdmin error", err);
      if (err?.code === "auth/email-already-in-use") {
        setFormError("Este email já está em uso. Use outro email ou faça login.");
      } else {
        setFormError(err?.message || "Erro ao criar admin.");
      }
    } finally {
      setBusy(false);
    }
  }

  // ============================
  // Login do admin
  // ============================

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setFormError("Informe email e senha.");
      return;
    }

    setBusy(true);
    try {
      const cred = await signInWithEmailAndPassword(
        auth,
        loginEmail.trim(),
        loginPassword
      );

      if (adminConfig && cred.user.uid !== adminConfig.adminUid) {
        await signOut(auth);
        setFormError("Essas credenciais não correspondem ao usuário admin.");
        return;
      }

      setMode("dashboard");
    } catch (err: any) {
      console.error("handleAdminLogin error", err);
      setFormError("Não foi possível entrar. Verifique as credenciais.");
    } finally {
      setBusy(false);
    }
  }

  // ============================
  // Logout
  // ============================

  async function handleLogout() {
    await signOut(auth);
    setMode("login");
  }

  // ============================
  // Exclusão de grupo
  // ============================

  async function confirmDeleteGroup() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await deleteDoc(doc(db, "groups", deleteTarget.id));
      setGroups((prev) => prev.filter((g) => g.id !== deleteTarget.id));
      setDeleteTarget(null);
      openDialog("Sucesso", "Grupo excluído com sucesso.", "success");
    } catch (err) {
      console.error("Erro ao excluir grupo", err);
      openDialog(
        "Erro",
        "Não foi possível excluir o grupo. Tente novamente mais tarde.",
        "danger"
      );
    } finally {
      setDeleteBusy(false);
    }
  }

  // ============================
  // UI Helpers
  // ============================

  const title = useMemo(() => {
    switch (mode) {
      case "setup":
        return "Configuração inicial do Admin";
      case "login":
        return "Login do Admin";
      case "dashboard":
        return "Admin – Painel de grupos";
      default:
        return "Admin";
    }
  }, [mode]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-sm text-slate-400">
              Área reservada para administração do TopGameScore.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => nav("/")}
              className="px-3 py-1.5 rounded-lg border border-slate-700 text-sm hover:bg-slate-800"
            >
              Voltar ao site
            </button>
            {mode === "dashboard" && (
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm"
              >
                Sair
              </button>
            )}
          </div>
        </div>

        {/* Setup admin */}
        {mode === "setup" && (
          <div className="max-w-md rounded-xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
            <h2 className="text-lg font-semibold">Criar usuário admin</h2>
            <p className="text-sm text-slate-400">
              Este passo será feito apenas uma vez. Depois, somente esse usuário
              poderá acessar o painel de administração.
            </p>

            <form className="space-y-3" onSubmit={handleSetupAdmin}>
              <div>
                <label className="block text-sm mb-1">Nome</label>
                <input
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  value={setupName}
                  onChange={(e) => setSetupName(e.target.value)}
                  disabled={busy}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Email</label>
                <input
                  type="email"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  value={setupEmail}
                  onChange={(e) => setSetupEmail(e.target.value)}
                  disabled={busy}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Senha</label>
                <input
                  type="password"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  value={setupPassword}
                  onChange={(e) => setSetupPassword(e.target.value)}
                  disabled={busy}
                />
              </div>

              {formError && (
                <p className="text-sm text-red-400">{formError}</p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="mt-2 w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 py-2 text-sm font-medium"
              >
                {busy ? "Criando admin..." : "Criar admin"}
              </button>
            </form>
          </div>
        )}

        {/* Login admin */}
        {mode === "login" && (
          <div className="max-w-md rounded-xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
            <h2 className="text-lg font-semibold">Login do admin</h2>
            <p className="text-sm text-slate-400">
              Informe as credenciais cadastradas na configuração inicial.
            </p>

            <form className="space-y-3" onSubmit={handleAdminLogin}>
              <div>
                <label className="block text-sm mb-1">Email</label>
                <input
                  type="email"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  disabled={busy}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Senha</label>
                <input
                  type="password"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  disabled={busy}
                />
              </div>

              {formError && (
                <p className="text-sm text-red-400">{formError}</p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="mt-2 w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 py-2 text-sm font-medium"
              >
                {busy ? "Entrando..." : "Entrar"}
              </button>
            </form>
          </div>
        )}

        {/* Dashboard admin */}
        {mode === "dashboard" && (
          <div className="space-y-4">
            {/* Cards de estatísticas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard
                label="Grupos totais"
                value={stats.total}
                helper="Todos os grupos já criados."
              />
              <StatCard
                label="Grupos premium"
                value={stats.premium}
                helper="Criados com plano Pro."
              />
              <StatCard
                label="Grupos free"
                value={stats.free}
                helper="Criados no plano gratuito."
              />
              <StatCard
                label="Grupos últimos 7 dias"
                value={stats.last7days}
                helper="Atividade recente."
              />
            </div>

            <div className="flex items-center justify-between mt-4">
              <div>
                <h2 className="text-lg font-semibold">Grupos criados</h2>
                <p className="text-xs text-slate-400">
                  Visualize todos os grupos do sistema. Você pode excluir grupos
                  manualmente se necessário.
                </p>
              </div>
              <button
                onClick={loadGroups}
                disabled={groupsLoading}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs hover:bg-slate-800 disabled:opacity-60"
              >
                {groupsLoading ? "Atualizando..." : "Atualizar"}
              </button>
            </div>

            <div className="overflow-auto rounded-xl border border-slate-800">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-900/80">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold border-b border-slate-800">
                      Grupo
                    </th>
                    <th className="px-3 py-2 text-left font-semibold border-b border-slate-800">
                      Código
                    </th>
                    <th className="px-3 py-2 text-left font-semibold border-b border-slate-800">
                      Host
                    </th>
                    <th className="px-3 py-2 text-left font-semibold border-b border-slate-800">
                      Email
                    </th>
                    <th className="px-3 py-2 text-left font-semibold border-b border-slate-800">
                      Plano
                    </th>
                    <th className="px-3 py-2 text-left font-semibold border-b border-slate-800">
                      Criado em
                    </th>
                    <th className="px-3 py-2 text-right font-semibold border-b border-slate-800">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groups.length === 0 && !groupsLoading && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-3 py-6 text-center text-slate-500 text-sm"
                      >
                        Nenhum grupo encontrado.
                      </td>
                    </tr>
                  )}

                  {groups.map((g) => (
                    <tr key={g.id} className="hover:bg-slate-900/60">
                      <td className="px-3 py-2 border-b border-slate-900">
                        {g.title}
                      </td>
                      <td className="px-3 py-2 border-b border-slate-900 font-mono text-xs">
                        {g.code}
                      </td>
                      <td className="px-3 py-2 border-b border-slate-900">
                        {g.hostName || g.hostEmail || g.hostUid || "-"}
                      </td>
                      <td className="px-3 py-2 border-b border-slate-900 text-xs">
                        {g.hostEmail || "-"}
                      </td>
                      <td className="px-3 py-2 border-b border-slate-900">
                        {g.plan === "pro" ? "Premium" : "Free"}
                      </td>
                      <td className="px-3 py-2 border-b border-slate-900 text-xs">
                        {g.createdAt
                          ? g.createdAt.toLocaleString("pt-BR")
                          : "-"}
                      </td>
                      <td className="px-3 py-2 border-b border-slate-900 text-right">
                        <button
                          onClick={() => setDeleteTarget(g)}
                          className="px-2 py-1 rounded bg-red-700 hover:bg-red-600 text-xs"
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-slate-500">
              Obs.: a exclusão feita aqui remove apenas o documento do grupo na
              coleção <code>groups</code>. Se você quiser remover subcoleções
              (players, answers, etc.), podemos depois criar uma Cloud Function
              para limpeza completa.
            </p>
          </div>
        )}
      </div>

      {/* Dialog global de feedback */}
      <Dialog
        open={dlgOpen}
        onClose={() => setDlgOpen(false)}
        title={dlgTitle}
        description={dlgMsg}
        variant={dlgVariant}
      />

      {/* Dialog de confirmação de exclusão */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => {
          if (!deleteBusy) setDeleteTarget(null);
        }}
        title="Confirmar exclusão"
        description={
          deleteTarget ? (
            <div className="space-y-3">
              <p>
                Tem certeza que deseja excluir o grupo{" "}
                <strong>{deleteTarget.title}</strong> ({deleteTarget.code})?
              </p>
              <p className="text-sm text-slate-400">
                Esta ação não pode ser desfeita.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg border border-slate-600 text-sm"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleteBusy}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-sm text-white disabled:opacity-60"
                  onClick={confirmDeleteGroup}
                  disabled={deleteBusy}
                >
                  {deleteBusy ? "Excluindo..." : "Excluir"}
                </button>
              </div>
            </div>
          ) : null
        }
        variant="warning"
      />
    </div>
  );
}

/* ---------------------- Subcomponente de card ---------------------- */

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: number;
  helper?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 shadow-sm">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="text-2xl font-semibold text-slate-50">{value}</div>
      {helper && (
        <div className="text-[11px] text-slate-500 mt-1">{helper}</div>
      )}
    </div>
  );
}
