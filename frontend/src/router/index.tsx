/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, type RouteObject } from "react-router-dom";
import { Paths } from "./paths";
import { MainLayout } from "@/components/layout/MainLayout";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuthStore } from "@/store/auth";
import { hasRole } from "@/utils/auth";

// Lazy-loaded page components
const Home = lazy(() => import("@/pages/Home"));
const Login = lazy(() => import("@/pages/Login"));
const Logout = lazy(() => import("@/pages/Logout"));
const Program = lazy(() => import("@/pages/Program"));
const ProgramMetrics = lazy(() => import("@/pages/ProgramMetrics"));
const Workloads = lazy(() => import("@/pages/Workloads"));
const Workload = lazy(() => import("@/pages/Workload"));
const PipelineRuns = lazy(() => import("@/pages/PipelineRuns"));
const PipelineRun = lazy(() => import("@/pages/PipelineRun"));
const PipelineHealth = lazy(() => import("@/pages/PipelineHealth"));
const Analysis = lazy(() => import("@/pages/Analysis"));
const CodeQuality = lazy(() => import("@/pages/CodeQuality"));
const QualityGates = lazy(() => import("@/pages/QualityGates"));
const Security = lazy(() => import("@/pages/Security"));
const DependencyAlerts = lazy(() => import("@/pages/DependencyAlerts"));
const Repositories = lazy(() => import("@/pages/Repositories"));
const Repository = lazy(() => import("@/pages/Repository"));
const Narratives = lazy(() => import("@/pages/Narratives"));
const Dashboards = lazy(() => import("@/pages/Dashboards"));
const Explore = lazy(() => import("@/pages/Explore"));
const NewQuery = lazy(() => import("@/pages/NewQuery"));
const SavedQueries = lazy(() => import("@/pages/SavedQueries"));
const SavedQuery = lazy(() => import("@/pages/SavedQuery"));
const Tickets = lazy(() => import("@/pages/Tickets"));
const Dora = lazy(() => import("@/pages/Dora"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const LicenseMissing = lazy(() => import("@/pages/LicenseMissing"));
const ConfigMissing = lazy(() => import("@/pages/ConfigMissing"));
const Unauthorised = lazy(() => import("@/pages/Unauthorised"));

// Admin pages
const Admin = lazy(() => import("@/pages/admin/Admin"));
const AdminTokens = lazy(() => import("@/pages/admin/Tokens"));
const AdminDatastores = lazy(() => import("@/pages/admin/Datastores"));
const AdminDatastoreDetail = lazy(() => import("@/pages/admin/DatastoreDetail"));
const AdminRemoteConnections = lazy(() => import("@/pages/admin/RemoteConnections"));

// Loading wrapper for suspense
function PageLoader({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

/**
 * Route guard component that checks if the authenticated user has the required role.
 * Redirects to the Unauthorised page if the user lacks the role.
 */
function RequireRole({ role, children }: { role: string; children: React.ReactNode }) {
  const { tokens } = useAuthStore();
  if (!hasRole(tokens?.accessToken, role)) {
    return <Navigate to={Paths.Unauthorised} replace />;
  }
  return <>{children}</>;
}

const routes: RouteObject[] = [
  // Auth pages with NavBar/Footer but no AppProvider auth checks
  {
    element: <AuthLayout />,
    children: [
      {
        path: Paths.Login,
        element: (
          <PageLoader>
            <Login />
          </PageLoader>
        ),
      },
      {
        path: Paths.LoginCallback,
        element: (
          <PageLoader>
            <Login />
          </PageLoader>
        ),
      },
      {
        path: Paths.Logout,
        element: (
          <PageLoader>
            <Logout />
          </PageLoader>
        ),
      },
    ],
  },
  // Error pages without layout
  {
    path: Paths.LicenseMissing,
    element: (
      <PageLoader>
        <LicenseMissing />
      </PageLoader>
    ),
  },
  {
    path: Paths.ConfigMissing,
    element: (
      <PageLoader>
        <ConfigMissing />
      </PageLoader>
    ),
  },
  {
    path: Paths.Unauthorised,
    element: (
      <PageLoader>
        <Unauthorised />
      </PageLoader>
    ),
  },
  {
    element: <MainLayout />,
    children: [
      {
        path: Paths.Home,
        element: (
          <PageLoader>
            <Home />
          </PageLoader>
        ),
      },
      {
        path: Paths.Program,
        element: (
          <PageLoader>
            <Program />
          </PageLoader>
        ),
      },
      {
        path: Paths.ProgramMetrics,
        element: (
          <PageLoader>
            <ProgramMetrics />
          </PageLoader>
        ),
      },
      {
        path: Paths.ProgramNarratives,
        element: (
          <PageLoader>
            <Narratives />
          </PageLoader>
        ),
      },
      {
        path: Paths.ProgramPipelineHealth,
        element: (
          <PageLoader>
            <PipelineHealth />
          </PageLoader>
        ),
      },
      {
        path: Paths.ProgramSecurity,
        element: (
          <PageLoader>
            <Security />
          </PageLoader>
        ),
      },
      {
        path: Paths.ProgramQualityGates,
        element: (
          <PageLoader>
            <QualityGates />
          </PageLoader>
        ),
      },
      {
        path: Paths.ProgramDependencyAlerts,
        element: (
          <PageLoader>
            <DependencyAlerts />
          </PageLoader>
        ),
      },
      {
        path: Paths.Repositories,
        element: (
          <PageLoader>
            <Repositories />
          </PageLoader>
        ),
      },
      {
        path: Paths.Workloads,
        element: (
          <PageLoader>
            <Workloads />
          </PageLoader>
        ),
      },
      {
        path: Paths.WorkloadHealth,
        element: (
          <PageLoader>
            <Workload />
          </PageLoader>
        ),
      },
      {
        path: Paths.WorkloadChanges,
        element: (
          <PageLoader>
            <Narratives />
          </PageLoader>
        ),
      },
      {
        path: Paths.WorkloadCodeQuality,
        element: (
          <PageLoader>
            <CodeQuality />
          </PageLoader>
        ),
      },
      {
        path: Paths.WorkloadAnalysis,
        element: (
          <PageLoader>
            <Analysis />
          </PageLoader>
        ),
      },
      {
        path: Paths.WorkloadPipelineRuns,
        element: (
          <PageLoader>
            <PipelineRuns />
          </PageLoader>
        ),
      },
      {
        path: Paths.WorkloadPipelineRun,
        element: (
          <PageLoader>
            <PipelineRun />
          </PageLoader>
        ),
      },
      {
        path: Paths.WorkloadPipelineHealth,
        element: (
          <PageLoader>
            <PipelineHealth />
          </PageLoader>
        ),
      },
      {
        path: Paths.WorkloadQualityGates,
        element: (
          <PageLoader>
            <QualityGates />
          </PageLoader>
        ),
      },
      {
        path: Paths.WorkloadRepositories,
        element: (
          <PageLoader>
            <Repositories />
          </PageLoader>
        ),
      },
      {
        path: Paths.WorkloadRepository,
        element: (
          <PageLoader>
            <Repository />
          </PageLoader>
        ),
      },
      {
        path: Paths.WorkloadDependencyAlerts,
        element: (
          <PageLoader>
            <DependencyAlerts />
          </PageLoader>
        ),
      },
      {
        path: Paths.ProgramTickets,
        element: (
          <PageLoader>
            <Tickets />
          </PageLoader>
        ),
      },
      {
        path: Paths.DORA,
        element: (
          <PageLoader>
            <Dora />
          </PageLoader>
        ),
      },
      {
        path: Paths.Explore,
        element: (
          <PageLoader>
            <Explore />
          </PageLoader>
        ),
      },
      {
        path: Paths.SavedDashboards,
        element: (
          <PageLoader>
            <Dashboards />
          </PageLoader>
        ),
      },
      {
        path: Paths.NewQuery,
        element: (
          <PageLoader>
            <NewQuery />
          </PageLoader>
        ),
      },
      {
        path: Paths.SavedQueries,
        element: (
          <PageLoader>
            <SavedQueries />
          </PageLoader>
        ),
      },
      {
        path: Paths.SavedQuery,
        element: (
          <PageLoader>
            <SavedQuery />
          </PageLoader>
        ),
      },
      // Admin routes
      {
        path: Paths.AdminHome,
        element: (
          <RequireRole role="admin">
            <PageLoader>
              <Admin />
            </PageLoader>
          </RequireRole>
        ),
      },
      {
        path: Paths.AdminTokens,
        element: (
          <RequireRole role="admin">
            <PageLoader>
              <AdminTokens />
            </PageLoader>
          </RequireRole>
        ),
      },
      {
        path: Paths.AdminDatastores,
        element: (
          <RequireRole role="admin">
            <PageLoader>
              <AdminDatastores />
            </PageLoader>
          </RequireRole>
        ),
      },
      {
        path: Paths.AdminRemoteConnections,
        element: (
          <RequireRole role="admin">
            <PageLoader>
              <AdminRemoteConnections />
            </PageLoader>
          </RequireRole>
        ),
      },
      {
        path: Paths.AdminDatastoreDetail,
        element: (
          <RequireRole role="admin">
            <PageLoader>
              <AdminDatastoreDetail />
            </PageLoader>
          </RequireRole>
        ),
      },
      {
        path: "*",
        element: (
          <PageLoader>
            <NotFound />
          </PageLoader>
        ),
      },
    ],
  },
];

export const router = createBrowserRouter(routes);

export { Paths };
