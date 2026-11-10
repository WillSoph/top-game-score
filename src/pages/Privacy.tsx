import { useTranslation } from "react-i18next";

import {
  Cookie,
  Database,
  Eye,
  FileLock2,
  Globe2,
  LockKeyhole,
  Mail,
  RefreshCw,
  Settings2,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";

import LegalPageLayout, {
  type LegalSection,
} from "../components/legal/LegalPageLayout";

export default function Privacy() {
  const { t, i18n } = useTranslation("legal");

  const sections: LegalSection[] = [
    {
      title: t("privacy.sections.introduction.title"),
      icon: <ShieldCheck size={24} />,
      content: <p>{t("privacy.sections.introduction.p1")}</p>,
    },
    {
      title: t("privacy.sections.data.title"),
      icon: <Database size={24} />,
      content: (
        <>
          <p>{t("privacy.sections.data.p1")}</p>
          <p>{t("privacy.sections.data.p2")}</p>
        </>
      ),
    },
    {
      title: t("privacy.sections.purposes.title"),
      icon: <Settings2 size={24} />,
      content: <p>{t("privacy.sections.purposes.p1")}</p>,
    },
    {
      title: t("privacy.sections.authentication.title"),
      icon: <Globe2 size={24} />,
      content: (
        <>
          <p>{t("privacy.sections.authentication.p1")}</p>
          <p>{t("privacy.sections.authentication.p2")}</p>
        </>
      ),
    },
    {
      title: t("privacy.sections.sharing.title"),
      icon: <Eye size={24} />,
      content: <p>{t("privacy.sections.sharing.p1")}</p>,
    },
    {
      title: t("privacy.sections.security.title"),
      icon: <LockKeyhole size={24} />,
      content: <p>{t("privacy.sections.security.p1")}</p>,
    },
    {
      title: t("privacy.sections.cookies.title"),
      icon: <Cookie size={24} />,
      content: <p>{t("privacy.sections.cookies.p1")}</p>,
    },
    {
      title: t("privacy.sections.retention.title"),
      icon: <FileLock2 size={24} />,
      content: <p>{t("privacy.sections.retention.p1")}</p>,
    },
    {
      title: t("privacy.sections.rights.title"),
      icon: <UserRoundCheck size={24} />,
      content: <p>{t("privacy.sections.rights.p1")}</p>,
    },
    {
      title: t("privacy.sections.changes.title"),
      icon: <RefreshCw size={24} />,
      content: <p>{t("privacy.sections.changes.p1")}</p>,
    },
    {
      title: t("privacy.sections.contact.title"),
      icon: <Mail size={24} />,
      content: <p>{t("privacy.sections.contact.p1")}</p>,
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
      type="privacy"
      title={t("privacy.hero.title")}
      highlight={t("privacy.hero.highlight")}
      subtitle={t("privacy.hero.subtitle")}
      updatedAt={updatedAt}
      sections={sections}
    />
  );
}
