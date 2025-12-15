import { useState, useMemo } from "react";
import { GripVertical, Save, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { TokenConfig, tokensToConfigs, isSmartToken, getSmartTokenDescription } from "@/lib/docgen/tokenConfig";
import { cn } from "@/lib/utils";

interface TokenConfigEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tokens: (string | TokenConfig)[];
  templateName: string;
  onSave: (configs: TokenConfig[]) => void;
  isSaving?: boolean;
}

export default function TokenConfigEditor({
  open,
  onOpenChange,
  tokens,
  templateName,
  onSave,
  isSaving,
}: TokenConfigEditorProps) {
  // Initialize configs from tokens
  const [configs, setConfigs] = useState<TokenConfig[]>(() => 
    tokensToConfigs(tokens)
  );

  // Separate smart tokens from manual tokens, only expand manual ones by default
  const { manualTokenIndices, smartTokenIndices } = useMemo(() => {
    const manual: number[] = [];
    const smart: number[] = [];
    configs.forEach((config, index) => {
      if (isSmartToken(config.token)) {
        smart.push(index);
      } else {
        manual.push(index);
      }
    });
    return { manualTokenIndices: manual, smartTokenIndices: smart };
  }, [configs]);

  // Default open only manual tokens
  const defaultOpenItems = useMemo(() => 
    manualTokenIndices.map(i => `item-${i}`),
    [manualTokenIndices]
  );

  const handleConfigChange = (index: number, field: keyof TokenConfig, value: string | boolean) => {
    setConfigs(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSave = () => {
    onSave(configs);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base">Configurer les champs</DialogTitle>
          <DialogDescription className="text-xs">
            Personnalisez les champs pour "{templateName}"
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto pr-2">
          <Accordion type="multiple" className="w-full" defaultValue={defaultOpenItems}>
                {configs.map((config, index) => {
                  const isSmart = isSmartToken(config.token);
                  
                  return (
                    <AccordionItem 
                      key={config.token} 
                      value={`item-${index}`}
                      className={cn(
                        "border-b",
                        isSmart && "border-l-2 border-l-green-500 bg-green-50/50 dark:bg-green-950/20"
                      )}
                    >
                      <AccordionTrigger className="hover:no-underline py-1.5 px-2">
                        <div className="flex items-center gap-2 text-left">
                          <GripVertical className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          {isSmart && (
                            <Sparkles className="h-3 w-3 text-green-600 flex-shrink-0" />
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn(
                              "font-medium text-sm",
                              isSmart && "text-green-700 dark:text-green-400"
                            )}>
                              {config.title || config.token}
                            </span>
                            <Badge 
                              variant={isSmart ? "default" : "outline"} 
                              className={cn(
                                "font-mono text-[10px] px-1.5 py-0",
                                isSmart && "bg-green-600 hover:bg-green-600"
                              )}
                            >
                              {`{{${config.token}}}`}
                            </Badge>
                            {isSmart && (
                              <span className="text-[10px] text-green-600 dark:text-green-400">
                                Pré-rempli
                              </span>
                            )}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-1.5 pb-2 px-2">
                        {isSmart ? (
                          <div className="pl-5 text-xs text-green-700 dark:text-green-400">
                            {getSmartTokenDescription(config.token)}
                          </div>
                        ) : (
                          <div className="space-y-2 pl-5">
                            <div className="space-y-1">
                              <Label htmlFor={`title-${index}`} className="text-xs">
                                Titre affiché
                              </Label>
                              <Input
                                id={`title-${index}`}
                                value={config.title}
                                onChange={(e) => handleConfigChange(index, "title", e.target.value)}
                                placeholder="Ex: Salaire mensuel brut"
                                className="h-8 text-sm"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label htmlFor={`desc-${index}`} className="text-xs">
                                Description / Instructions
                              </Label>
                              <Textarea
                                id={`desc-${index}`}
                                value={config.description}
                                onChange={(e) => handleConfigChange(index, "description", e.target.value)}
                                placeholder="Ex: Indiquez le montant mensuel brut en euros"
                                rows={2}
                                className="text-sm resize-none"
                              />
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="space-y-0">
                                <Label htmlFor={`required-${index}`} className="text-xs">
                                  Champ obligatoire
                                </Label>
                              </div>
                              <Switch
                                id={`required-${index}`}
                                checked={config.required !== false}
                                onCheckedChange={(checked) => handleConfigChange(index, "required", checked)}
                              />
                            </div>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            <X className="h-3 w-3 mr-1" />
            Annuler
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            <Save className="h-3 w-3 mr-1" />
            {isSaving ? "..." : "Enregistrer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
