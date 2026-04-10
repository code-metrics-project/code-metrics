import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, Trash2 } from "lucide-react";
import { useConfig } from "@/hooks/useConfig";
import { useI18n } from "@/hooks/useI18n";

interface TagPair {
  key: string;
  value: string;
}

export interface TagInputProps {
  defaults?: TagPair[];
  disabled?: boolean;
  onChange?: (value: TagPair[]) => void;
}

export function TagInput({ defaults = [], disabled = false, onChange }: TagInputProps) {
  const { t } = useI18n();
  const { config } = useConfig();
  const [tags, setTags] = useState<TagPair[]>(defaults);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const allTagPairs: Record<string, string[]> = config?.systemConfig?.tags ?? {};
  const options = Object.keys(allTagPairs);

  const addTag = (key: string) => {
    const newTags = [...tags, { key, value: "" }];
    setTags(newTags);
    setAddMenuOpen(false);
    onChange?.(newTags);
  };

  const deleteTag = (index: number) => {
    const newTags = [...tags];
    newTags.splice(index, 1);
    setTags(newTags);
    onChange?.(newTags);
  };

  const updateTagValue = (index: number, value: string) => {
    const newTags = [...tags];
    newTags[index] = { ...newTags[index], value };
    setTags(newTags);
    onChange?.(newTags);
  };

  return (
    <div className="space-y-2">
      <Popover open={addMenuOpen} onOpenChange={setAddMenuOpen}>
        <PopoverTrigger asChild>
          <Button variant="secondary" size="sm" disabled={disabled}>
            {t("components:queryByTag")}
            <ChevronDown className="ml-1 h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-0">
          <div className="py-1">
            {options.map((tag) => (
              <button
                key={tag}
                onClick={() => addTag(tag)}
                className="hover:bg-accent hover:text-accent-foreground w-full px-3 py-2 text-left text-sm"
              >
                {tag}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {tags.map((tag, index) => (
        <div key={index} className="flex items-center gap-1">
          <Select value={tag.value} onValueChange={(value) => updateTagValue(index, value)} disabled={disabled}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={tag.key} />
            </SelectTrigger>
            <SelectContent>
              {(allTagPairs[tag.key] ?? []).map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" onClick={() => deleteTag(index)} disabled={disabled}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
