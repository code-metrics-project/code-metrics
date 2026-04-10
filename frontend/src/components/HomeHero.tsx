import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Code2,
  GitBranch,
  TrendingUp,
  ShieldCheck,
  Gauge,
  Bug,
  Activity,
  GitPullRequest,
  Timer,
  FileCode,
  Layers,
} from "lucide-react";
import { listWorkloads } from "@/config";
import { getRepositoryDetails } from "@/services/workload";
import { useAppContext } from "@/components/AppProvider";
import { useI18n } from "@/hooks/useI18n";

// Randomly pick n unique items from an array
function pickRandomUnique<T>(arr: T[], count: number): T[] {
  const unique = [...new Set(arr)];
  const shuffled = unique.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 20) return "evening";
  return "night";
}

// Time-based gradient configurations
const gradientConfig: Record<TimeOfDay, { light: string; dark: string }> = {
  morning: {
    // Warm sunrise colors: yellow, orange, amber
    light:
      "radial-gradient(ellipse at top left, var(--color-amber-200), var(--color-yellow-100), var(--color-orange-100), var(--color-amber-50))",
    dark: "radial-gradient(ellipse at top left, var(--color-amber-950), var(--color-orange-950), var(--color-yellow-950), var(--color-slate-900))",
  },
  afternoon: {
    // Bright sky colors: sky blue, cyan
    light:
      "radial-gradient(ellipse at top left, var(--color-sky-200), var(--color-blue-100), var(--color-cyan-100), var(--color-sky-50))",
    dark: "radial-gradient(ellipse at top left, var(--color-slate-900), var(--color-sky-950), var(--color-cyan-950), var(--color-slate-900))",
  },
  evening: {
    // Sunset colors: blue, purple, pink
    light:
      "radial-gradient(ellipse at top left, var(--color-blue-200), var(--color-purple-100), var(--color-pink-100), var(--color-indigo-50))",
    dark: "radial-gradient(ellipse at top left, var(--color-indigo-950), var(--color-purple-950), var(--color-blue-950), var(--color-slate-900))",
  },
  night: {
    // Deep night colors: indigo, slate, purple
    light:
      "radial-gradient(ellipse at top left, var(--color-indigo-200), var(--color-slate-200), var(--color-purple-100), var(--color-slate-100))",
    dark: "radial-gradient(ellipse at top left, var(--color-slate-950), var(--color-indigo-950), var(--color-purple-950), var(--color-slate-900))",
  },
};

// Time-based text gradient for the "Metrics" heading
const headingGradientConfig: Record<TimeOfDay, { light: string; dark: string }> = {
  morning: {
    light: "from-amber-600 via-orange-600 to-yellow-600",
    dark: "from-amber-400 via-orange-400 to-yellow-400",
  },
  afternoon: {
    light: "from-sky-600 via-blue-600 to-cyan-600",
    dark: "from-sky-400 via-blue-400 to-cyan-400",
  },
  evening: {
    light: "from-blue-600 via-purple-600 to-pink-600",
    dark: "from-blue-400 via-purple-400 to-pink-400",
  },
  night: {
    light: "from-indigo-600 via-purple-600 to-slate-600",
    dark: "from-indigo-400 via-purple-400 to-slate-400",
  },
};

// Poll interval for time-based updates (30 minutes in milliseconds)
const TIME_POLL_INTERVAL = 30 * 60 * 1000;

export function HomeHero() {
  const { isSystemConfigLoaded } = useAppContext();
  const { t } = useI18n();
  // Get time-based gradient with polling for updates
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(getTimeOfDay);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeOfDay(getTimeOfDay());
    }, TIME_POLL_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  const gradients = gradientConfig[timeOfDay];
  const headingGradient = headingGradientConfig[timeOfDay];
  // Get workload and repo names for decorative display (randomly selected)
  // Re-derives when systemConfig finishes loading so labels appear
  const configLabels = useMemo(() => {
    if (!isSystemConfigLoaded) {
      return { workloads: [], repos: [] };
    }
    try {
      const allWorkloads = listWorkloads().map((w) => w.name);
      const allRepos = getRepositoryDetails().map((r) => r.name);
      return {
        workloads: pickRandomUnique(allWorkloads, 2),
        repos: pickRandomUnique(allRepos, 2),
      };
    } catch {
      return { workloads: [], repos: [] };
    }
  }, [isSystemConfigLoaded]);

  return (
    <section className="relative overflow-hidden">
      {/* Time-based animated gradient background */}
      <div
        className="animate-bg-gradient absolute inset-0 bg-size-[200%_200%]"
        style={{
          backgroundImage: gradients.light,
        }}
      />
      <div
        className="animate-bg-gradient absolute inset-0 bg-size-[200%_200%] opacity-0 transition-opacity dark:opacity-100"
        style={{
          backgroundImage: gradients.dark,
        }}
      />

      <div className="relative z-10 container mx-auto px-4 py-16">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Text Content */}
          <div className="text-center lg:text-left">
            <h1 className="mb-6 text-5xl font-bold tracking-tight text-slate-900 drop-shadow-sm lg:text-6xl dark:text-white">
              Code
              <span
                className={`bg-linear-to-r ${headingGradient.light} dark:${headingGradient.dark} bg-clip-text text-transparent`}
              >
                Metrics
              </span>
            </h1>
            <p className="mx-auto mb-6 max-w-xl text-xl text-slate-700 lg:mx-0 dark:text-slate-300">
              {t("components:homeHero.tagline")}
            </p>
            <p className="mb-8 text-lg text-slate-600 dark:text-slate-400">{t("components:homeHero.getStarted")}</p>
          </div>

          {/* Decorative floating icons and config labels - overlapping cluster layout */}
          <div className="relative hidden h-72 lg:block">
            {/* Cluster 1: Top-left icons */}
            <div className="animate-float-slow absolute top-0 left-8">
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/80">
                <BarChart3 className="h-9 w-9 text-sky-600 dark:text-sky-400" />
              </div>
            </div>
            <div className="animate-float-medium absolute top-6 left-24">
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/80">
                <TrendingUp className="h-9 w-9 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="animate-float-fast absolute top-16 left-4">
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/80">
                <Activity className="h-9 w-9 text-pink-600 dark:text-pink-400" />
              </div>
            </div>

            {/* Cluster 2: Top-right icons */}
            <div className="animate-float-medium absolute top-2 right-16">
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/80">
                <Code2 className="h-9 w-9 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <div className="animate-float-slow absolute top-8 right-0">
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/80">
                <ShieldCheck className="h-9 w-9 text-rose-600 dark:text-rose-400" />
              </div>
            </div>
            <div className="animate-float-fast absolute top-20 right-8">
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/80">
                <Bug className="h-9 w-9 text-orange-600 dark:text-orange-400" />
              </div>
            </div>

            {/* Center: Dynamic labels with icons */}
            {configLabels.workloads[0] && (
              <div className="animate-float-slow absolute top-24 left-1/2 -translate-x-1/2">
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-4 py-2.5 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/90">
                  <Layers className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {configLabels.workloads[0]}
                  </span>
                </div>
              </div>
            )}

            {/* Cluster 3: Bottom-left icons + label */}
            <div className="animate-float-fast absolute bottom-8 left-0">
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/80">
                <Gauge className="h-9 w-9 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
            <div className="animate-float-medium absolute bottom-0 left-16">
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/80">
                <Timer className="h-9 w-9 text-cyan-600 dark:text-cyan-400" />
              </div>
            </div>
            {configLabels.repos[0] && (
              <div className="animate-float-slow absolute bottom-14 left-24">
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-4 py-2.5 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/90">
                  <GitBranch className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {configLabels.repos[0]}
                  </span>
                </div>
              </div>
            )}

            {/* Cluster 4: Bottom-right icons + label */}
            <div className="animate-float-medium absolute right-20 bottom-4">
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/80">
                <GitPullRequest className="h-9 w-9 text-teal-600 dark:text-teal-400" />
              </div>
            </div>
            <div className="animate-float-slow absolute right-4 bottom-12">
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/80">
                <FileCode className="h-9 w-9 text-lime-600 dark:text-lime-400" />
              </div>
            </div>
            {configLabels.workloads[1] && (
              <div className="animate-float-fast absolute right-0 bottom-0">
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-4 py-2.5 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/90">
                  <Layers className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {configLabels.workloads[1]}
                  </span>
                </div>
              </div>
            )}

            {/* Extra floating repo label */}
            {configLabels.repos[1] && (
              <div className="animate-float-medium absolute top-12 left-1/3">
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-4 py-2.5 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/90">
                  <GitBranch className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {configLabels.repos[1]}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
