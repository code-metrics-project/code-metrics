import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Paths } from "@/router/paths";
import { ThemeSelector } from "./ThemeSelector";
import { LanguageSelector } from "./LanguageSelector";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { getConfig } from "@/config";
import { useI18n } from "@/hooks/useI18n";
import { RoleGate } from "@/components/RoleGate";

export function NavBar() {
  const { t } = useI18n();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);

  const navLinks = [
    { to: Paths.Home, label: t("nav:home") },
    { to: Paths.Program, label: t("nav:programme") },
    { to: Paths.Workloads, label: t("nav:workload") },
    { to: Paths.NewQuery, label: t("nav:newQuery") },
    { to: Paths.Explore, label: t("nav:explore") },
  ];

  // Check if auth is required from web config
  const authRequired = (() => {
    try {
      return getConfig().webConfig?.auth?.required ?? true;
    } catch {
      return true;
    }
  })();

  const handleLogout = async () => {
    await logout();
    navigate(Paths.Login);
  };

  return (
    <header className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="container flex h-16 items-center">
        {/* Logo and brand */}
        <Link to={Paths.Home} className="mr-6 flex items-center space-x-2 no-underline">
          <img alt="CodeMetrics logo" src="/assets/img/codemetrics_logo.png" className="h-8 w-auto" />
          <span className="text-foreground text-xl font-bold">CodeMetrics</span>
        </Link>

        {/* Desktop Navigation */}
        {isAuthenticated && (
          <nav className="hidden items-center space-x-1 lg:flex">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    "hover:text-foreground px-4 py-2 text-sm font-medium transition-colors",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
            <RoleGate role="admin">
              <NavLink
                to={Paths.AdminHome}
                className={({ isActive }) =>
                  cn(
                    "hover:text-foreground px-4 py-2 text-sm font-medium transition-colors",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )
                }
              >
                {t("nav:admin")}
              </NavLink>
            </RoleGate>
          </nav>
        )}

        {/* Right side: spacer, theme selector, language selector, logout, mobile menu */}
        <div className="ml-auto flex items-center gap-2">
          <LanguageSelector />
          <ThemeSelector />

          {/* Logout button (desktop) */}
          {isAuthenticated && authRequired && (
            <Button variant="outline" size="sm" className="hidden lg:inline-flex" onClick={handleLogout}>
              {t("nav:logout")}
            </Button>
          )}

          {/* Mobile Menu */}
          {isAuthenticated && (
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open main navigation</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>{t("common:navigation")}</SheetTitle>
                </SheetHeader>
                <nav className="mt-6 flex flex-col space-y-2">
                  {navLinks.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      className={({ isActive }) =>
                        cn(
                          "hover:bg-accent rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                          isActive && "bg-accent"
                        )
                      }
                      onClick={() => setDrawerOpen(false)}
                    >
                      {link.label}
                    </NavLink>
                  ))}
                  <RoleGate role="admin">
                    <NavLink
                      to={Paths.AdminHome}
                      className={({ isActive }) =>
                        cn(
                          "hover:bg-accent rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                          isActive && "bg-accent"
                        )
                      }
                      onClick={() => setDrawerOpen(false)}
                    >
                      {t("nav:admin")}
                    </NavLink>
                  </RoleGate>
                  {authRequired && (
                    <Button variant="outline" className="mt-4" onClick={handleLogout}>
                      {t("nav:logout")}
                    </Button>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>
    </header>
  );
}
