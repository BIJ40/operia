import { useState } from "react";
import { GripVertical, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { TokenConfig, tokensToConfigs } from "@/lib/docgen/tokenConfig";

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
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Configurer les champs</DialogTitle>
          <DialogDescription>
            Personnalisez le titre et la description de chaque champ pour "{templateName}"
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <Accordion type="multiple" className="w-full" defaultValue={configs.map((_, i) => `item-${i}`)}>
            {configs.map((config, index) => (
              <AccordionItem key={config.token} value={`item-${index}`}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="font-medium">
                        {config.title || config.token}
                      </span>
                      <Badge variant="outline" className="ml-2 font-mono text-xs">
                        {`{{${config.token}}}`}
                      </Badge>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 pb-6">
                  <div className="space-y-4 pl-7">
                    <div className="space-y-2">
                      <Label htmlFor={`title-${index}`}>
                        Titre affiché
                      </Label>
                      <Input
                        id={`title-${index}`}
                        value={config.title}
                        onChange={(e) => handleConfigChange(index, "title", e.target.value)}
                        placeholder="Ex: Salaire mensuel brut"
                      />
                      <p className="text-xs text-muted-foreground">
                        Le titre qui apparaîtra lors de la saisie
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`desc-${index}`}>
                        Description / Instructions
                      </Label>
                      <Textarea
                        id={`desc-${index}`}
                        value={config.description}
                        onChange={(e) => handleConfigChange(index, "description", e.target.value)}
                        placeholder="Ex: Indiquez le montant mensuel brut en euros. Exemple: 2 500 €"
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground">
                        Ajoutez des exemples ou instructions pour guider la saisie
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor={`required-${index}`}>
                          Champ obligatoire
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          L'utilisateur devra remplir ce champ
                        </p>
                      </div>
                      <Switch
                        id={`required-${index}`}
                        checked={config.required !== false}
                        onCheckedChange={(checked) => handleConfigChange(index, "required", checked)}
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
