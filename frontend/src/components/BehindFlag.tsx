import type { ReactNode } from "react";
import { type FeatureKey, listActiveFeatures } from "@/config/features";

interface BehindFlagProps {
  feature: FeatureKey;
  children: ReactNode;
}

export function BehindFlag({ feature, children }: BehindFlagProps) {
  const featureEnabled = listActiveFeatures()[feature];

  if (!featureEnabled) {
    return null;
  }

  return <>{children}</>;
}
