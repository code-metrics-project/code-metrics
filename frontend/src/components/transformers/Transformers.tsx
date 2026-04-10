import { useState, useMemo, useCallback } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Settings2, Trash2 } from "lucide-react";
import {
  getTransformersForQueries,
  type ConfiguredTransformer,
  type TransformerArgs,
  type TransformerId,
} from "./transform";
import { useI18n } from "@/hooks/useI18n";

// Simple unique ID generator
let idCounter = 0;
const generateId = () => `transformer-${Date.now()}-${++idCounter}`;

export type TransformState = Record<string, ConfiguredTransformer[]>;

export interface TransformersProps {
  queryTypes: string[];
  disabled?: boolean;
  onChange?: (state: TransformState) => void;
}

export function Transformers({ queryTypes, disabled = false, onChange }: TransformersProps) {
  const { t } = useI18n();
  const transformerMap = useMemo(() => getTransformersForQueries(queryTypes), [queryTypes]);

  const [transformState, setTransformState] = useState<TransformState>(() => {
    const state: TransformState = {};
    for (const [key] of transformerMap) {
      state[key] = [];
    }
    return state;
  });

  const [activeTab, setActiveTab] = useState<string>(() => {
    const firstKey = transformerMap.keys().next().value;
    return firstKey || "";
  });

  const addTransformer = useCallback(
    (queryName: string) => {
      setTransformState((prev) => {
        const newState = {
          ...prev,
          [queryName]: [
            ...(prev[queryName] || []),
            {
              id: generateId(),
              transform: null,
              args: {},
            },
          ],
        };
        onChange?.(newState);
        return newState;
      });
    },
    [onChange]
  );

  const deleteTransformer = useCallback(
    (queryName: string, index: number) => {
      setTransformState((prev) => {
        const newList = [...(prev[queryName] || [])];
        newList.splice(index, 1);
        const newState = { ...prev, [queryName]: newList };
        onChange?.(newState);
        return newState;
      });
    },
    [onChange]
  );

  const updateTransformerType = useCallback(
    (queryName: string, index: number, transformId: TransformerId | null) => {
      setTransformState((prev) => {
        const newList = [...(prev[queryName] || [])];
        newList[index] = { ...newList[index], transform: transformId, args: {} };
        const newState = { ...prev, [queryName]: newList };
        onChange?.(newState);
        return newState;
      });
    },
    [onChange]
  );

  const updateTransformerArgs = useCallback(
    (queryName: string, index: number, args: TransformerArgs) => {
      setTransformState((prev) => {
        const newList = [...(prev[queryName] || [])];
        newList[index] = { ...newList[index], args };
        const newState = { ...prev, [queryName]: newList };
        onChange?.(newState);
        return newState;
      });
    },
    [onChange]
  );

  // Don't render if no transformers available
  if (transformerMap.size === 0) {
    return null;
  }

  return (
    <Accordion type="single" collapsible className="mb-5">
      <AccordionItem value="transformers">
        <AccordionTrigger disabled={disabled} className="font-bold">
          <span className="flex items-center">
            <Settings2 className="mr-2 h-4 w-4" />
            {t("components:transformers.title")}
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <p className="text-muted-foreground mb-4 text-sm">
            {t("components:transformers.description")} <strong>{t("components:transformers.cumulativeNote")}</strong>
          </p>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList>
              {Array.from(transformerMap.keys()).map((key) => (
                <TabsTrigger key={key} value={key}>
                  {key}
                </TabsTrigger>
              ))}
            </TabsList>

            {Array.from(transformerMap.entries()).map(([key, transformers]) => (
              <TabsContent key={key} value={key}>
                {(transformState[key] || []).map((configuredTransformer, index) => (
                  <div key={configuredTransformer.id} className="border-b p-4">
                    <div className="mb-4 flex items-center gap-4">
                      <Select
                        value={configuredTransformer.transform || ""}
                        onValueChange={(value) => updateTransformerType(key, index, value as TransformerId)}
                        disabled={disabled}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue
                            placeholder={t("components:transformers.chooseTransformer", { index: index + 1 })}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {transformers.map((tf) => (
                            <SelectItem key={tf.id} value={tf.id} disabled={tf.disabled}>
                              {tf.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => deleteTransformer(key, index)}
                        disabled={disabled}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {configuredTransformer.transform && (
                      <>
                        {(() => {
                          const TransformerComponent = transformers.find(
                            (t) => t.id === configuredTransformer.transform
                          )?.component;
                          return TransformerComponent ? (
                            <TransformerComponent
                              value={configuredTransformer.args}
                              onChange={(args) => updateTransformerArgs(key, index, args)}
                              disabled={disabled}
                            />
                          ) : null;
                        })()}
                      </>
                    )}
                  </div>
                ))}

                <Button variant="ghost" onClick={() => addTransformer(key)} className="mt-4" disabled={disabled}>
                  {t("components:transformers.addTransformer")}
                </Button>
              </TabsContent>
            ))}
          </Tabs>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export default Transformers;
