import { getConfig } from "@/utils/config";

type NamedValue = {
  value: string;
  title: string;
};

export function getIssuePriorities(): NamedValue[] {
  return getConfig().systemConfig.issuePriorities.map((p) => {
    return { value: p, title: p };
  });
}
