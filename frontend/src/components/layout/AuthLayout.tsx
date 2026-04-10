import { Outlet } from "react-router-dom";
import { NavBar } from "./NavBar";
import { Footer } from "./Footer";

/**
 * Layout for authentication pages (Login, Logout).
 * Similar to MainLayout but without AppProvider (which handles auth redirects).
 */
export function AuthLayout() {
  return (
    <div className="page-bg relative flex min-h-screen flex-col">
      <NavBar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
