import {
  Users,
  Crown,
  Gamepad2,
  Sparkles,
  Layers3,
  Coins,
  ArrowUpRight,
} from "lucide-react";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import SuperadminLayout from "../components/superadmin/SuperadminLayout";
import StatCard from "../components/superadmin/StatCard";

import { useEffect, useState } from "react";
import { superadminAuth } from "../lib/superadminAuth";

const subscriptions: { month: string; total: number }[] = [];

const planDistribution: { name: string; value: number }[] = [];

const recentUsers: {
  id: string;
  name: string;
  email: string;
  plan: "Free" | "Pro";
  createdAt: string;
}[] = [];

const aiUsage = {
  generated: null as number | null,
  averageQuestions: null as number | null,
  estimatedCost: null as number | null,
};

const COLORS = ["#00E5A0", "#6375FF"];

const formatNumber = (value: number | null) =>
  value === null ? "—" : value.toLocaleString("pt-BR");

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-[#29435C] bg-gradient-to-br from-[#101F32] to-[#0C1429] p-5 shadow-lg shadow-black/10">
      <h2 className="mb-5 text-base font-semibold text-white">{title}</h2>
      {children}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-full min-h-[160px] items-center justify-center text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

type OverviewStats = {
  users: number | null;
  proUsers: number | null;
  quizzes: number | null;
  aiQuizzes: number | null;
};

export default function SuperadminDashboardPage() {
  const [stats, setStats] = useState<OverviewStats>({
    users: null,
    proUsers: null,
    quizzes: null,
    aiQuizzes: null,
  });

  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadStats() {
      try {
        const user = superadminAuth.currentUser;

        if (!user) {
          throw new Error("Sessão administrativa não encontrada.");
        }

        const token = await user.getIdToken();

        const response = await fetch(
          "/.netlify/functions/superadmin-overview",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error(`Erro ao carregar indicadores: ${response.status}`);
        }

        const data: OverviewStats = await response.json();

        if (active) {
          setStats(data);
          setStatsError("");
        }
      } catch (error) {
        if (active) {
          setStatsError(
            error instanceof Error
              ? error.message
              : "Erro ao carregar indicadores.",
          );
        }
      } finally {
        if (active) setLoadingStats(false);
      }
    }

    loadStats();

    return () => {
      active = false;
    };
  }, []);

  return (
    <SuperadminLayout
      title="Visão geral"
      description="Acompanhe os principais indicadores da plataforma."
    >
      <div className="space-y-6">
        {loadingStats && (
          <p className="text-sm text-slate-400">Carregando indicadores...</p>
        )}

        {statsError && (
          <p
            role="alert"
            className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300"
          >
            {statsError}
          </p>
        )}
        {/* Indicadores principais */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Usuários"
            value={formatNumber(stats.users)}
            icon={<Users size={25} />}
            iconColor="text-blue-400"
          />
          <StatCard
            label="Assinantes Pro"
            value={formatNumber(stats.proUsers)}
            icon={<Crown size={25} />}
            iconColor="text-amber-400"
          />
          <StatCard
            label="Quizzes criados"
            value={formatNumber(stats.quizzes)}
            icon={<Gamepad2 size={25} />}
            iconColor="text-emerald-400"
          />
          <StatCard
            label="Quizzes gerados por IA"
            value={formatNumber(stats.aiQuizzes)}
            icon={<Sparkles size={25} />}
            iconColor="text-cyan-400"
          />
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.4fr_1fr]">
          <Panel title="Novas assinaturas (Pro)">
            <div className="h-[260px]">
              {subscriptions.length === 0 ? (
                <EmptyState text="Aguardando integração com o Stripe." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={subscriptions}>
                    <defs>
                      <linearGradient
                        id="subscriptionGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#00E5A0"
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="100%"
                          stopColor="#00E5A0"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid stroke="#26364A" vertical={false} />
                    <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} />
                    <YAxis
                      stroke="#94A3B8"
                      fontSize={12}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0B1429",
                        border: "1px solid #29435C",
                        borderRadius: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#00E5A0"
                      strokeWidth={3}
                      fill="url(#subscriptionGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Panel>

          <Panel title="Planos dos usuários">
            <div className="h-[260px]">
              {planDistribution.length === 0 ? (
                <EmptyState text="Aguardando dados dos planos Free e Pro." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={planDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={3}
                    >
                      {planDistribution.map((_, index) => (
                        <Cell
                          key={index}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0B1429",
                        border: "1px solid #29435C",
                        borderRadius: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </Panel>
        </div>

        {/* Últimos cadastros e IA */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.4fr_1fr]">
          <Panel title="Últimos cadastros">
            {recentUsers.length === 0 ? (
              <EmptyState text="Aguardando integração com Firebase Authentication." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400">
                      <th className="pb-3 font-medium">Usuário</th>
                      <th className="pb-3 font-medium">E-mail</th>
                      <th className="pb-3 font-medium">Plano</th>
                      <th className="pb-3 font-medium">Cadastro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentUsers.map((user) => (
                      <tr key={user.id} className="border-b border-white/5">
                        <td className="py-3 text-white">{user.name}</td>
                        <td className="py-3 text-slate-300">{user.email}</td>
                        <td className="py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs ${
                              user.plan === "Pro"
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-slate-600/30 text-slate-300"
                            }`}
                          >
                            {user.plan}
                          </span>
                        </td>
                        <td className="py-3 text-slate-400">
                          {user.createdAt}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Uso da IA (últimos 30 dias)">
            <div className="divide-y divide-white/10">
              <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <Sparkles size={20} className="text-purple-400" />
                  <span className="text-sm text-slate-300">
                    Quizzes gerados
                  </span>
                </div>
                <strong>{formatNumber(aiUsage.generated)}</strong>
              </div>

              <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <Layers3 size={20} className="text-blue-400" />
                  <span className="text-sm text-slate-300">
                    Média de perguntas por quiz
                  </span>
                </div>
                <strong>
                  {aiUsage.averageQuestions === null
                    ? "—"
                    : aiUsage.averageQuestions.toFixed(1)}
                </strong>
              </div>

              <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <Coins size={20} className="text-amber-400" />
                  <span className="text-sm text-slate-300">
                    Custo estimado (API)
                  </span>
                </div>
                <strong>
                  {aiUsage.estimatedCost === null
                    ? "—"
                    : `US$ ${aiUsage.estimatedCost.toFixed(2)}`}
                </strong>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-1 text-xs text-slate-500">
              <ArrowUpRight size={14} />
              Dados de consumo disponíveis após a integração com IA.
            </div>
          </Panel>
        </div>
      </div>
    </SuperadminLayout>
  );
}
