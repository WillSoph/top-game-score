
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Traduções existentes da aplicação
import en from "./locales/en.json";
import pt from "./locales/pt.json";
import es from "./locales/es.json";

// Traduções das páginas jurídicas
import legalEn from "./locales/en/legal.json";
import legalPt from "./locales/pt/legal.json";
import legalEs from "./locales/es/legal.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: en,
        legal: legalEn,
      },
      pt: {
        translation: pt,
        legal: legalPt,
      },
      es: {
        translation: es,
        legal: legalEs,
      },
    },

    fallbackLng: "en",

    supportedLngs: ["en", "pt", "es"],

    load: "languageOnly",

    defaultNS: "translation",

    ns: ["translation", "legal"],

    interpolation: {
      escapeValue: false,
    },

    react: {
      useSuspense: false,
    },

    detection: {
      order: [
        "querystring",
        "localStorage",
        "navigator",
        "htmlTag",
      ],

      caches: ["localStorage"],

      lookupQuerystring: "lng",
      lookupLocalStorage: "i18nextLng",
    },
  });

export default i18n;
