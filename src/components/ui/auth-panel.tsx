import { Input } from "./input";
import { Button, ButtonSecondary } from "./button";

type AuthStep = "none" | "choose" | "login" | "register";
type TFunc = (k: string) => string;

export type AuthPanelProps = {
  step: AuthStep;
  onBack: () => void;
  onChooseLogin: () => void;
  onChooseRegister: () => void;

  username: string;
  password: string;
  setUsername: (v: string) => void;
  setPassword: (v: string) => void;

  // novos (opcionais p/ manter compatibilidade)
  email?: string;
  setEmail?: (v: string) => void;
  onForgotPassword?: () => void;

  onLogin: () => void;
  onRegister: () => void;
  loading: boolean;
  t: TFunc;
};

export default function AuthPanel({
  step,
  onBack,
  onChooseLogin,
  onChooseRegister,
  username,
  password,
  setUsername,
  setPassword,
  email,
  setEmail,
  onForgotPassword,
  onLogin,
  onRegister,
  loading,
  t,
}: AuthPanelProps) {
  if (step === "choose") {
    return (
      <div className="space-y-3">
        <h2 className="font-semibold text-slate-200 text-base sm:text-lg">
          {t("home.modal.title")}
        </h2>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button variant="primary" onClick={onChooseLogin} className="flex-1">
            {t("home.modal.login")}
          </Button>
          <Button variant="secondary" onClick={onChooseRegister} className="flex-1">
            {t("home.modal.register")}
          </Button>
        </div>
      </div>
    );
  }

  if (step === "login" || step === "register") {
    const isLogin = step === "login";

    return (
      <div className="space-y-4">
        <h2 className="font-semibold text-slate-200 text-base sm:text-lg">
          {isLogin ? t("home.modal.loginTitle") : t("home.modal.registerTitle")}
        </h2>

        <div className="space-y-2">
          {/* No registro pedimos e-mail real */}
          {!isLogin && (
            <Input
              placeholder={t("home.host.email") || "Email"}
              type="email"
              autoComplete="email"
              value={email ?? ""}
              onChange={(e) => setEmail?.(e.target.value)}
            />
          )}

          {/* No login o placeholder continua de username (sem espaços),
              mas você pode digitar e-mail também se o seu handler aceitar */}
          <Input
            placeholder={t("home.host.username")!}
            inputMode="email"
            autoComplete={isLogin ? "username" : "username"}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <Input
            placeholder={t("home.host.password")!}
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {/* Link de "Esqueci a senha" apenas no login, se o callback existir */}
          {isLogin && onForgotPassword && (
            <div className="flex justify-end">
              <button
                type="button"
                className="text-xs text-indigo-400 hover:text-indigo-300 underline disabled:opacity-60"
                onClick={onForgotPassword}
                disabled={loading}
              >
                {t("home.host.forgot") || "Forgot your password?"}
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <ButtonSecondary onClick={onBack}>← {t("common.back")}</ButtonSecondary>

          {isLogin ? (
            <button
              onClick={onLogin}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition"
            >
              {t("home.modal.login")}
            </button>
          ) : (
            <button
              onClick={onRegister}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 transition"
            >
              {t("home.modal.register")}
            </button>
          )}
        </div>

        {/* Dica/ajuda abaixo do painel */}
        <p className="text-xs text-slate-400">
          {isLogin
            ? t("home.usernameHint")
            : t("home.registerHint") || t("home.usernameHint")}
        </p>
      </div>
    );
  }

  return null;
}
