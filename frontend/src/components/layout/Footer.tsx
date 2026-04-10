import { getBootstrap } from "@/config";

export function Footer() {
  let version = "unknown";
  try {
    version = getBootstrap().apiVersion;
  } catch {
    // Bootstrap may not be loaded yet
  }

  return (
    <footer className="bg-background/50 border-t">
      <div className="container py-6 text-center">
        <p className="text-muted-foreground mb-1 text-xs">CodeMetrics v{version}</p>
        <p className="text-muted-foreground text-sm">
          &copy; {new Date().getFullYear()} — <strong className="font-semibold">Deloitte Digital</strong>
        </p>
      </div>
    </footer>
  );
}
