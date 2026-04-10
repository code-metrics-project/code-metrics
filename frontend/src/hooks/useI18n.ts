import { useTranslation as useReactI18nTranslation } from "react-i18next";

export const useTranslation = () => {
  return useReactI18nTranslation();
};

export const useI18n = () => {
  const { t, i18n } = useReactI18nTranslation();

  return {
    t,
    i18n,
    locale: i18n.language,
    setLocale: (locale: string) => i18n.changeLanguage(locale),
  };
};
