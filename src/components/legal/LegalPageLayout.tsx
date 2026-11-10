import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LegalHeader from "../LegalHeader";
import { ArrowLeft, ExternalLink, Gamepad2, ShieldCheck } from "lucide-react";

export type LegalSection = {
  title: string;
  icon: ReactNode;
  content: ReactNode;
};

type LegalPageLayoutProps = {
  type: "terms" | "privacy";
  title: string;
  highlight: string;
  subtitle: string;
  updatedAt: string;
  sections: LegalSection[];
};

export default function LegalPageLayout({
  type,
  title,
  highlight,
  subtitle,
  updatedAt,
  sections,
}: LegalPageLayoutProps) {
  const { t } = useTranslation("legal");

  const isPrivacy = type === "privacy";

  const image = isPrivacy ? "/nyxie-privacy.png" : "/nyxie-terms.png";

  const documentTitle = isPrivacy
    ? t("privacy.documentTitle")
    : t("terms.documentTitle");

  const documentDescription = isPrivacy
    ? t("privacy.documentDescription")
    : t("terms.documentDescription");

  const imageAlt = isPrivacy ? t("privacy.imageAlt") : t("terms.imageAlt");

  const relatedPage = isPrivacy ? "/terms" : "/privacy";

  const relatedPageLabel = isPrivacy
    ? t("common.viewTerms")
    : t("common.viewPrivacy");

  return (
    <div className="min-h-screen bg-[#080e20] text-white">
      {/* Header */}
      <LegalHeader />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-purple-500/20 bg-[#10112d]">
        {/* Efeitos de iluminação */}
        <div className="pointer-events-none absolute -left-32 top-0 h-80 w-80 rounded-full bg-green-500/15 blur-[100px]" />

        <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-purple-600/25 blur-[110px]" />

        {/* Fundo geométrico */}
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(135deg, transparent 38%, rgba(147,51,234,.2) 39%, transparent 41%, transparent 70%, rgba(34,211,238,.12) 71%, transparent 73%)",
          }}
        />

        <div className="relative mx-auto grid min-h-[340px] max-w-7xl items-center gap-6 px-5 py-12 md:grid-cols-2 md:px-8 md:py-16">
          {/* Informações do Hero */}
          <div className="relative z-10">
            <Link
              to="/"
              className="mb-7 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-[#a3ff28]"
            >
              <ArrowLeft size={16} />
              {t("common.backHome")}
            </Link>

            {/* Ícone da página */}
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#a3ff28]/30 bg-[#a3ff28]/10 text-[#a3ff28]">
              {isPrivacy ? <ShieldCheck size={30} /> : <Gamepad2 size={30} />}
            </div>

            {/* Título */}
            <h1 className="max-w-xl text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              {title} <span className="text-[#a3ff28]">{highlight}</span>
            </h1>

            {/* Descrição */}
            <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-300 md:text-lg">
              {subtitle}
            </p>

            {/* Selo */}
            <div className="mt-7 inline-flex items-center rounded-full border border-purple-400/20 bg-purple-500/10 px-4 py-2 text-xs text-purple-200">
              {t("common.trust")}
            </div>
          </div>

          {/* Ilustração da Nyxie */}
          <div className="relative hidden h-[340px] items-center justify-center overflow-hidden md:flex lg:h-[380px]">
            {/* Iluminação atrás da personagem */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-72 w-72 rounded-full bg-purple-600/25 blur-[90px]" />
            </div>

            {/* Nyxie ampliada */}
            <img
              src={image}
              alt={imageAlt}
              className="
                absolute
                left-1/2
                top-[-5px]
                h-[620px]
                w-auto
                max-w-none
                -translate-x-1/2
                object-contain
                drop-shadow-[0_0_35px_rgba(168,85,247,0.35)]
                lg:h-[700px]
              "
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          </div>
        </div>
      </section>

      {/* Conteúdo principal */}
      <main className="mx-auto max-w-5xl px-4 py-10 md:px-8 md:py-14">
        <div className="overflow-hidden rounded-3xl border border-purple-500/25 bg-gradient-to-br from-[#15162f] via-[#101426] to-[#0c1725] shadow-2xl shadow-purple-950/20">
          {/* Cabeçalho do documento */}
          <div className="border-b border-white/10 px-6 py-7 md:px-10">
            <h2 className="text-xl font-bold md:text-2xl">{documentTitle}</h2>

            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              {documentDescription}
            </p>
          </div>

          {/* Seções do documento */}
          <div className="divide-y divide-purple-400/15 px-5 md:px-10">
            {sections.map((section, index) => (
              <section
                key={`${type}-${index}`}
                className="flex gap-4 py-7 md:gap-6"
              >
                {/* Ícone */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-purple-400/20 bg-purple-500/10 text-[#d78bff]">
                  {section.icon}
                </div>

                {/* Conteúdo */}
                <div className="min-w-0 flex-1">
                  <h3 className="mb-3 text-base font-bold text-white md:text-lg">
                    {index + 1}. {section.title}
                  </h3>

                  <div className="space-y-3 text-sm leading-7 text-slate-300 md:text-[15px]">
                    {section.content}
                  </div>
                </div>
              </section>
            ))}
          </div>

          {/* Rodapé do documento */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-purple-500/20 bg-[#0b1022]/60 px-6 py-5 md:px-10">
            <span className="text-xs text-slate-400">
              {t("common.lastUpdated")}: {updatedAt}
            </span>

            <Link
              to={relatedPage}
              className="inline-flex items-center gap-2 text-sm font-medium text-[#a3ff28] transition hover:text-white"
            >
              {relatedPageLabel}
              <ExternalLink size={15} />
            </Link>
          </div>
        </div>

        {/* Informações de contato */}
        <div className="mt-10 text-center">
          <p className="text-sm text-slate-400">{t("common.questions")}</p>

          <p className="mt-2 text-sm text-slate-300">{t("common.contact")}</p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#070b18]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-7 text-center text-xs text-slate-400 md:flex-row md:px-8">
          <span>
            © {new Date().getFullYear()} TopGameScore.{" "}
            {t("common.rightsReserved")}
          </span>

          <div className="flex flex-wrap justify-center gap-5">
            <Link to="/" className="transition hover:text-white">
              {t("common.home")}
            </Link>

            <Link to="/terms" className="transition hover:text-white">
              {t("common.terms")}
            </Link>

            <Link to="/privacy" className="transition hover:text-white">
              {t("common.privacy")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
