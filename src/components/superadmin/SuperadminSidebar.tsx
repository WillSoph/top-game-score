import { NavLink, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Gamepad2,
  Sparkles,
  Wallet,
  BarChart3,
  Settings,
  ShieldCheck,
  LogOut,
  X,
} from "lucide-react";

import { superadminAuth } from "../../lib/superadminAuth";

type Props = {
  open: boolean;
  onClose: () => void;
};

const menu = [
  { label: "Visão geral", icon: LayoutDashboard, to: "/superadmin/dashboard" },
  { label: "Usuários", icon: Users, to: "/superadmin/users" },
  { label: "Assinaturas", icon: CreditCard, to: "/superadmin/subscriptions" },
  { label: "Quizzes", icon: Gamepad2, to: "/superadmin/quizzes" },
  { label: "Uso da IA", icon: Sparkles, to: "/superadmin/ai-usage" },
  { label: "Financeiro", icon: Wallet, to: "/superadmin/finance" },
  { label: "Relatórios", icon: BarChart3, to: "/superadmin/reports" },
  { label: "Configurações", icon: Settings, to: "/superadmin/settings" },
];

export default function SuperadminSidebar({ open, onClose }: Props) {
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut(superadminAuth);
    navigate("/superadmin", { replace: true });
  }

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/70 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[244px] flex-col border-r border-cyan-400/10 bg-[#071326] transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-white/5 px-5 py-7">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-center">
              <img
                src="/logo-top-game-score.png"
                alt="TopGameScore"
                className="h-auto w-full max-w-[190px] object-contain"
              />
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar menu"
              className="text-slate-400 lg:hidden"
            >
              <X size={20} />
            </button>
          </div>

          <div className="mt-5 flex justify-center">
            <span className="flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
              <ShieldCheck size={14} />
              Superadmin
            </span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          {menu.map(({ label, icon: Icon, to }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-gradient-to-r from-emerald-500 to-blue-600 text-white shadow-lg shadow-blue-900/20"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-300 transition hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut size={18} />
            Sair
          </button>

          <p className="mt-4 text-center text-xs text-slate-600">
            TopGameScore · Superadmin
          </p>
        </div>
      </aside>
    </>
  );
}
