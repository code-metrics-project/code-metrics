import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, AlertTriangle, Info } from "lucide-react";

export type Alert = {
  type: "error" | "success" | "warning" | "info";
  message: string;
} | null;

export interface AlertMessageProps {
  alert: Alert;
}

export function AlertMessage({ alert }: AlertMessageProps) {
  if (!alert) return null;

  const getVariant = () => {
    switch (alert.type) {
      case "error":
        return "destructive";
      case "success":
        return "default"; // shadcn doesn't have success variant by default
      case "warning":
        return "default";
      case "info":
        return "default";
      default:
        return "default";
    }
  };

  const getIcon = () => {
    switch (alert.type) {
      case "error":
        return <AlertCircle className="h-4 w-4" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "info":
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <Alert variant={getVariant()}>
      {getIcon()}
      <AlertDescription>{alert.message}</AlertDescription>
    </Alert>
  );
}
