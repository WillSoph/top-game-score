import { useTranslation } from "react-i18next";

import {
  BookOpen,
  CreditCard,
  FileCheck2,
  Gamepad2,
  Gavel,
  LockKeyhole,
  ShieldAlert,
  Sparkles,
  UserRound,
} from "lucide-react";

import LegalPageLayout, {
  type LegalSection,
} from "../components/legal/LegalPageLayout";

export default function Terms() {
  const { t, i18n } = useTranslation("legal");

  const sections: LegalSection[] = [
    {
      title: t("terms.sections.platform.title"),
      icon: <Gamepad2 size={24} />,
      content: (
        <>
          <p>{t("terms.sections.platform.p1")}</p>
          <p>{t("terms.sections.platform.p2")}</p>
        </>
      ),
    },
    {
      title: t("terms.sections.acceptance.title"),
      icon: <FileCheck2 size={24} />,
      content: <p>{t("terms.sections.acceptance.p1")}</p>,
    },
    {
      title: t("terms.sections.accounts.title"),
      icon: <UserRound size={24} />,
      content: (
        <>
          <p>{t("terms.sections.accounts.p1")}</p>
          <p>{t("terms.sections.accounts.p2")}</p>
        </>
      ),
    },
    {
      title: t("terms.sections.quizzes.title"),
      icon: <BookOpen size={24} />,
      content: (
        <>
          <p>{t("terms.sections.quizzes.p1")}</p>
          <p>{t("terms.sections.quizzes.p2")}</p>
          <p>{t("terms.sections.quizzes.p3")}</p>
        </>
      ),
    },
    {
      title: t("terms.sections.plans.title"),
      icon: <CreditCard size={24} />,
      content: (
        <>
          <p>{t("terms.sections.plans.p1")}</p>
          <p>{t("terms.sections.plans.p2")}</p>
          <p>{t("terms.sections.plans.p3")}</p>
        </>
      ),
    },
    {
      title: t("terms.sections.ai.title"),
      icon: <Sparkles size={24} />,
      content: (
        <>
          <p>{t("terms.sections.ai.p1")}</p>
          <p>{t("terms.sections.ai.p2")}</p>
        </>
      ),
    },
    {
      title: t("terms.sections.prohibited.title"),
      icon: <ShieldAlert size={24} />,
      content: <p>{t("terms.sections.prohibited.p1")}</p>,
    },
    {
      title: t("terms.sections.availability.title"),
      icon: <LockKeyhole size={24} />,
      content: <p>{t("terms.sections.availability.p1")}</p>,
    },
    {
      title: t("terms.sections.changes.title"),
      icon: <Gavel size={24} />,
      content: (
        <>
          <p>{t("terms.sections.changes.p1")}</p>
          <p>{t("terms.sections.changes.p2")}</p>
        </>
      ),
    },
  ];

  const language = (i18n.resolvedLanguage || i18n.language || "pt").split(
    "-",
  )[0];

  const locale =
    language === "en" ? "en-US" : language === "es" ? "es-ES" : "pt-BR";

  const updatedAt = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date("2026-11-10T12:00:00Z"));

  return (
    <LegalPageLayout
      type="terms"
      title={t("terms.hero.title")}
      highlight={t("terms.hero.highlight")}
      subtitle={t("terms.hero.subtitle")}
      updatedAt={updatedAt}
      sections={sections}
    />
  );
}
