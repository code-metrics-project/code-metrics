import { createRouter, createWebHistory, type RouteLocationNormalized } from "vue-router";
import { useAuthStore } from "@/store/auth";
import { Paths } from "./paths";
import { pinia } from "@/main";
import { fetchSystemConfig, getBootstrap } from "@/utils/config";

const routes = [
  {
    path: Paths.Login,
    name: "Login",
    component: () => import(/* webpackChunkName: "login" */ "@/pages/Login.vue"), //dynamic import of component and dependency
  },
  {
    path: Paths.Home,
    name: "Home",
    component: () => import(/* webpackChunkName: "home" */ "@/pages/Home.vue"), //dynamic import of component and dependency
  },
  {
    path: Paths.Program,
    name: "Program",
    component: () => import(/* webpackChunkName: "program" */ "@/pages/Program.vue"), //dynamic import of component and dependency
  },
  {
    path: Paths.ProgramNarratives,
    name: "Program Narratives",
    component: () => import(/* webpackChunkName: "narratives" */ "@/pages/Narratives.vue"), //dynamic import of component and dependency
  },
  {
    path: Paths.SavedDashboards,
    name: "Dashboards",
    component: () => import(/* webpackChunkName: "dashboards" */ "@/pages/Dashboards.vue"), //dynamic import of component and dependency
  },
  {
    path: Paths.DORA,
    name: "DORA",
    component: () => import(/* webpackChunkName: "dora" */ "@/pages/Dora.vue"), //dynamic import of component and dependency
  },
  {
    path: Paths.ProgramMetrics,
    name: "Program Metrics",
    component: () => import(/* webpackChunkName: "metrics" */ "@/pages/ProgramMetrics.vue"), //dynamic import of component and dependency
  },
  {
    path: Paths.ProgramTickets,
    name: "Tickets",
    component: () => import(/* webpackChunkName: "tickets" */ "@/pages/Tickets.vue"), //dynamic import of component and dependency
  },
  {
    path: Paths.LoginCallback,
    name: "LoginCallback",
    component: () => import(/* webpackChunkName: "logincallback" */ "@/pages/Login.vue"), //dynamic import of component and dependency
  },
  {
    path: Paths.Logout,
    name: "Logout",
    component: () => import(/* webpackChunkName: "logout" */ "@/pages/Logout.vue"), //dynamic import of component and dependency
  },
  {
    path: Paths.WorkloadPipelineRuns,
    name: "PipelineRuns",
    component: () => import(/* webpackChunkName: "pipeline" */ "@/pages/PipelineRuns.vue"), //dynamic import of component and dependency
  },
  {
    path: Paths.WorkloadPipelineRun,
    name: "PipelineRun",
    component: () => import(/* webpackChunkName: "pipelinerun" */ "@/pages/PipelineRun.vue"), //dynamic import of component and dependency
  },
  {
    path: Paths.WorkloadPipelineHealth,
    name: "PipelineHealth",
    component: () => import(/* webpackChunkName: "pipelinehealth" */ "@/pages/PipelineHealth.vue"), //dynamic import of component and dependency
  },
  {
    path: Paths.WorkloadAnalysis,
    name: "Analysis",
    component: () => import(/* webpackChunkName: "analysis" */ "@/pages/Analysis.vue"), //dynamic import of component and dependency
  },
  {
    path: Paths.Explore,
    name: "Explore",
    component: () => import(/* webpackChunkName: "explore" */ "@/pages/Explore.vue"), //dynamic import of component and dependency
  },
  {
    path: Paths.NewQuery,
    name: "NewQuery",
    component: () => import(/* webpackChunkName: "newquery" */ "@/pages/NewQuery.vue"), //dynamic import of component and dependency
  },
  {
    path: Paths.SavedQueries,
    name: "SavedQueries",
    component: () => import(/* webpackChunkName: "savedqueries" */ "@/pages/SavedQueries.vue"), //dynamic import of component and dependency
  },
  {
    path: Paths.SavedQuery,
    name: "SavedQuery",
    component: () => import(/* webpackChunkName: "savedquery" */ "@/pages/SavedQuery.vue"), //dynamic import of component and dependency
  },
  {
    path: Paths.ProgramPipelineHealth,
    name: "Programme Pipeline",
    component: () => import(/* webpackChunkName: "pipelinehealth" */ "@/pages/PipelineHealth.vue"), //dynamic import of component and dependency
  },
  {
    path: Paths.ProgramQualityGates,
    name: "Quality Gates",
    component: () => import(/* webpackChunkName: "security" */ "@/pages/QualityGates.vue"), //dynamic import of component and dependency
  },
  {
    path: Paths.ProgramSecurity,
    name: "Security",
    component: () => import(/* webpackChunkName: "security" */ "@/pages/Security.vue"), //dynamic import of component and dependency
  },
  {
    path: Paths.Workloads,
    name: "Workloads",
    component: () => import(/* webpackChunkName: "teams" */ "@/pages/Workloads.vue"), //dynamic import of component and dependency
  },
  {
    path: Paths.WorkloadHealth,
    name: "Workload",
    component: () => import(/* webpackChunkName: "team" */ "@/pages/Workload.vue"), //dynamic import of component and dependency
  },
  {
    path: Paths.WorkloadChanges,
    name: "Workload Changes",
    component: () => import(/* webpackChunkName: "changes" */ "@/pages/Narratives.vue"), //dynamic import of component and dependency
  },
  {
    path: Paths.WorkloadCodeQuality,
    name: "Code Quality",
    component: () => import(/* webpackChunkName: "codequality" */ "@/pages/CodeQuality.vue"), //dynamic import of component and dependency
  },
  {
    path: Paths.WorkloadQualityGates,
    name: "Workload Quality Gates",
    component: () => import(/* webpackChunkName: "security" */ "@/pages/QualityGates.vue"), //dynamic import of component and dependency
  },
  {
    path: Paths.LicenseMissing,
    name: "License Missing",
    component: () => import(/* webpackChunkName: "licensemissing" */ "@/pages/LicenseMissing.vue"), //dynamic import of component and dependency
  },
  {
    path: Paths.ConfigMissing,
    name: "Config Missing",
    component: () => import(/* webpackChunkName: "configmissing" */ "@/pages/ConfigMissing.vue"), //dynamic import of component and dependency
  },
  {
    path: Paths.AdminHome,
    name: "Admin Home",
    component: () => import(/* webpackChunkName: "adminhome" */ "@/pages/admin/Admin.vue"), //dynamic import of component and dependency
  },
  {
    path: Paths.AdminTokens,
    name: "Admin Tokens",
    component: () => import(/* webpackChunkName: "admintokens" */ "@/pages/admin/Tokens.vue"), //dynamic import of component and dependency
  },
  {
    path: "/:pathMatch(.*)*",
    name: "404",
    component: () => import(/* webpackChunkName: "error404" */ "@/pages/404.vue"), //dynamic import of component and dependency },
  },
];

const unauthenticatedRoutes = ["Login", "LoginCallback", "Logout", "License Missing", "Config Missing"];

const isUnauthenticatedRoute = (route: RouteLocationNormalized) => {
  return unauthenticatedRoutes.includes(route.name as string);
};

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach(async (to) => {
  const systemConfig = await getBootstrap();
  if (!systemConfig.isLicensed && to.path !== Paths.LicenseMissing) {
    router.push({ name: "License Missing" });
    return false;
  }
});

router.beforeEach(async (to) => {
  const systemConfig = await getBootstrap();

  if (!systemConfig.hasConfig && to.path !== Paths.LicenseMissing && to.path !== Paths.ConfigMissing) {
    return { name: "Config Missing" };
  }
});

router.beforeEach(async (to, _from, next) => {
  if (!isUnauthenticatedRoute(to)) {
    const authStore = useAuthStore(pinia);

    if (!authStore.isAuthenticated) {
      authStore.rememberDestination(to);
      next({ name: "Login" });
      return;
    }

    // system config required for authenticated routes
    await fetchSystemConfig(authStore.tokens?.accessToken!!);
  }

  next();
});

export default router;
