import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/hooks/useI18n";
import { supportedLanguages, type SupportedLanguage } from "@/i18n";
import { Features, isFeatureActive } from "@/config/features";

export function LanguageSelector() {
  const { i18n, t } = useI18n();

  const handleLanguageChange = (langCode: SupportedLanguage) => {
    i18n.changeLanguage(langCode);
  };

  // Only render if language selector feature is enabled
  if (!isFeatureActive(Features.languageSelector)) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title={t("common.language")}>
          <Languages className="h-5 w-5" />
          <span className="sr-only">{t("common.changeLanguage")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {supportedLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={i18n.language === lang.code ? "bg-accent" : ""}
          >
            <span className="mr-2">{lang.flag}</span>
            {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
