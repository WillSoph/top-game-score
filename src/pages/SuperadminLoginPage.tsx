import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  ShieldCheck,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowRight,
  Gamepad2,
} from "lucide-react";

import {
  superadminAuth,
  prepareSuperadminAuth,
  checkSuperadminAccess,
} from "../lib/superadminAuth";

export default function SuperadminLoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");

    try {
      await prepareSuperadminAuth();

      await signInWithEmailAndPassword(superadminAuth, email.trim(), password);

      const authorized = await checkSuperadminAccess();

      if (!authorized) {
        await signOut(superadminAuth);
        throw new Error("Acesso não autorizado. Verifique suas permissões.");
      }

      navigate("/superadmin/dashboard", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error && err.message.startsWith("Acesso não autorizado")
          ? err.message
          : "Não foi possível entrar. Verifique suas credenciais e tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Informe seu e-mail para recuperar a senha.");
      return;
    }

    try {
      await sendPasswordResetEmail(superadminAuth, email.trim());

      setMessage(
        "Se o e-mail estiver cadastrado, você receberá instruções para redefinir a senha.",
      );
    } catch {
      setError("Não foi possível solicitar a recuperação de senha.");
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050B1C] px-4 py-12 text-white">
      <div className="pointer-events-none absolute -left-40 top-0 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[130px]" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[130px]" />

      <div className="relative z-10 w-full max-w-[460px]">
        <div className="mb-9 flex flex-col items-center text-center">
          <div className="flex items-center justify-center">
            <img
              src="/logo-top-game-score.png"
              alt="TopGameScore"
              className="h-auto w-full max-w-[190px] object-contain"
            />
          </div>

          <div className="mt-6 flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-400">
            <ShieldCheck size={17} />
            Superadmin
          </div>

          <h2 className="mt-7 text-2xl font-bold">Acesso do Superadmin</h2>

          <p className="mt-2 text-sm text-slate-400">
            Área exclusiva para administração do TopGameScore
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="rounded-2xl border border-cyan-400/20 bg-[#0B1429]/90 p-7 shadow-2xl shadow-black/30 sm:p-9"
        >
          <div className="space-y-4">
            <div className="relative">
              <Mail
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="email"
                autoComplete="username"
                placeholder="E-mail"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-14 w-full rounded-xl border border-slate-700 bg-[#19253D] pl-12 pr-4 text-white outline-none transition placeholder:text-slate-400 focus:border-emerald-400"
              />
            </div>

            <div className="relative">
              <LockKeyhole
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Senha"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-14 w-full rounded-xl border border-slate-700 bg-[#19253D] pl-12 pr-12 text-white outline-none transition placeholder:text-slate-400 focus:border-emerald-400"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300"
            >
              {error}
            </p>
          )}

          {message && (
            <p
              role="status"
              className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300"
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-blue-500 font-bold text-[#061326] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Verificando acesso..." : "Entrar"}
            {!loading && <ArrowRight size={19} />}
          </button>

          <button
            type="button"
            onClick={handleResetPassword}
            className="mt-5 w-full text-center text-sm text-slate-300 underline underline-offset-4 hover:text-emerald-400"
          >
            Esqueci minha senha
          </button>
        </form>

        <div className="mt-10 flex items-center justify-center gap-2 text-slate-500">
          <ShieldCheck size={15} />
          <span className="text-xs">Acesso restrito e protegido</span>
        </div>
      </div>
    </main>
  );
}
