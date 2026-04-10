import { Outlet } from "react-router-dom";
import { NavBar } from "./NavBar";
import { Footer } from "./Footer";
import { AppProvider } from "@/components/AppProvider";

export function MainLayout() {
  return (
    <AppProvider>
      <div className="page-bg relative flex min-h-screen flex-col">
        <NavBar />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
    </AppProvider>
  );
}
