import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThemeStore, themes } from "@/store/theme";

const themeIcons = {
  light: Sun,
  dark: Moon,
  auto: Monitor,
};

export function ThemeSelector() {
  const { theme, changeTheme } = useThemeStore();
  const CurrentIcon = themeIcons[theme];

  const handleClick = () => {
    const currentIndex = themes.indexOf(theme);
    const newIndex = currentIndex >= themes.length - 1 ? 0 : currentIndex + 1;
    const newTheme = themes[newIndex];
    changeTheme(newTheme);
  };

  return (
    <Button variant="ghost" size="icon" onClick={handleClick}>
      <CurrentIcon className="h-5 w-5" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
