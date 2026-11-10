import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, X } from "lucide-react";
import LanguageSwitcher from "./LanguageSwitcher";

type Lang = "pt" | "en" | "es";

const labels = {
  pt: {
    features: "Recursos",
    pricing: "Planos",
    faq: "FAQ",
    terms: "Termos",
    privacy: "Privacidade",
    menu: "Abrir menu",
  },
  en: {
    features: "Features",
    pricing: "Pricing",
    faq: "FAQ",
    terms: "Terms",
    privacy: "Privacy",
    menu: "Open menu",
  },
  es: {
    features: "Funciones",
    pricing: "Planes",
    faq: "FAQ",
    terms: "Términos",
    privacy: "Privacidad",
    menu: "Abrir menú",
  },
};

export default function LegalHeader() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const detectedLang = (i18n.resolvedLanguage || i18n.language || "pt").split(
    "-",
  )[0];

  const lang: Lang =
    detectedLang === "pt" || detectedLang === "en" || detectedLang === "es"
      ? detectedLang
      : "pt";

  const c = labels[lang];

  function goToSection(section: string) {
    setMobileMenuOpen(false);
    navigate(`/#${section}`);
  }

  const navClass =
    "text-sm font-semibold text-slate-200 transition hover:text-emerald-400";

  return (
    <header className="relative z-30 border-b border-white/10 bg-[#071322]/35 shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-xl">
      <div className="mx-auto flex h-20 w-full max-w-[1600px] items-center justify-between gap-5 px-5 sm:px-8 lg:px-12 xl:px-16">
        {/* Logo oficial */}
        <Link
          to="/"
          aria-label="TopGameScore - Home"
          className="flex shrink-0 items-center"
        >
          <img
            src="/logo-top-game-score.png"
            alt="TopGameScore"
            className="h-auto w-40 sm:w-48 lg:w-56"
          />
        </Link>

        {/* Navegação desktop */}
        <nav
          aria-label="Navegação principal"
          className="hidden items-center gap-9 lg:flex"
        >
          <button
            type="button"
            onClick={() => goToSection("features")}
            className={navClass}
          >
            {c.features}
          </button>

          <button
            type="button"
            onClick={() => goToSection("pricing")}
            className={navClass}
          >
            {c.pricing}
          </button>

          <button
            type="button"
            onClick={() => goToSection("faq")}
            className={navClass}
          >
            {c.faq}
          </button>
        </nav>

        {/* Idiomas */}
        <div className="hidden items-center gap-4 sm:flex">
          <LanguageSwitcher />
        </div>

        {/* Menu mobile */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((value) => !value)}
          className="rounded-xl border border-white/15 bg-white/5 p-2.5 text-white lg:hidden"
          aria-label={c.menu}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={23} /> : <Menu size={23} />}
        </button>
      </div>

      {/* Navegação mobile */}
      {mobileMenuOpen && (
        <div className="border-t border-white/10 bg-[#0b1626]/95 px-5 py-5 backdrop-blur-xl lg:hidden">
          <div className="flex flex-col gap-2">
            {[
              { label: c.features, section: "features" },
              { label: c.pricing, section: "pricing" },
              { label: c.faq, section: "faq" },
            ].map((item) => (
              <button
                key={item.section}
                type="button"
                onClick={() => goToSection(item.section)}
                className="rounded-xl px-4 py-3 text-left text-sm font-semibold text-slate-200 hover:bg-white/5"
              >
                {item.label}
              </button>
            ))}

            <div className="my-2 border-t border-white/10" />

            <Link
              to="/terms"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/5"
            >
              {c.terms}
            </Link>

            <Link
              to="/privacy"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/5"
            >
              {c.privacy}
            </Link>

            <div className="my-2 border-t border-white/10" />

            <LanguageSwitcher />
          </div>
        </div>
      )}
    </header>
  );
}
