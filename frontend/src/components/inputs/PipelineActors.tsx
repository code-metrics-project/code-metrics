import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Actor types matching the backend enum
// eslint-disable-next-line react-refresh/only-export-components
export enum ActorType {
  All = "All",
  User = "User",
  Bot = "Bot",
  Organization = "Organization",
  App = "App",
}

const ACTOR_TYPES = [
  { value: ActorType.All, label: "All" },
  { value: ActorType.User, label: "User" },
  { value: ActorType.Bot, label: "Bot" },
  { value: ActorType.Organization, label: "Organization" },
  { value: ActorType.App, label: "App" },
];

export interface PipelineActorsProps {
  defaults?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
}

export function PipelineActors({ defaults = ActorType.All, disabled = false, onChange }: PipelineActorsProps) {
  const { t } = useTranslation();
  const [actorType, setActorType] = useState<string>(defaults);

  const handleChange = (value: string) => {
    setActorType(value);
    onChange?.(value);
  };

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{t("components:inputs.pipelineActor")}</label>
      <Select value={actorType} onValueChange={handleChange} disabled={disabled}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t("components:inputs.selectActorType")} />
        </SelectTrigger>
        <SelectContent>
          {ACTOR_TYPES.map((type) => (
            <SelectItem key={type.value} value={type.value}>
              {type.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
