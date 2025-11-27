import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Headphones } from 'lucide-react';

interface UserSupportConfigSectionProps {
  supportLevel: number;
  onSupportLevelChange: (level: number) => void;
  serviceCompetencies: any;
  onServiceCompetenciesChange: (competencies: any) => void;
}

export function UserSupportConfigSection({
  supportLevel,
  onSupportLevelChange,
  serviceCompetencies,
  onServiceCompetenciesChange,
}: UserSupportConfigSectionProps) {
  const toggleCompetency = (key: string) => {
    const newCompetencies = { ...serviceCompetencies };
    if (newCompetencies[key]) {
      delete newCompetencies[key];
    } else {
      newCompetencies[key] = true;
    }
    onServiceCompetenciesChange(newCompetencies);
  };

  return (
    <Collapsible defaultOpen className="border rounded-lg border-blue-200 bg-blue-50/30">
      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-blue-50/50">
        <div className="flex items-center gap-2">
          <Headphones className="w-4 h-4 text-blue-500" />
          <span className="font-medium">Configuration Support</span>
        </div>
        <ChevronDown className="w-4 h-4 transition-transform duration-200" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4 space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Niveau Apogée</Label>
          <RadioGroup
            value={String(supportLevel)}
            onValueChange={(val) => onSupportLevelChange(Number(val))}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="1" id="level-1" />
              <Label htmlFor="level-1" className="cursor-pointer">N1</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="2" id="level-2" />
              <Label htmlFor="level-2" className="cursor-pointer">N2</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="3" id="level-3" />
              <Label htmlFor="level-3" className="cursor-pointer">N3</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Compétences services</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={serviceCompetencies.apogee ? "default" : "outline"}
              onClick={() => toggleCompetency('apogee')}
            >
              Apogée
            </Button>
            <Button
              type="button"
              size="sm"
              variant={serviceCompetencies.helpconfort ? "default" : "outline"}
              onClick={() => toggleCompetency('helpconfort')}
            >
              HelpConfort
            </Button>
            <Button
              type="button"
              size="sm"
              variant={serviceCompetencies.apporteurs ? "default" : "outline"}
              onClick={() => toggleCompetency('apporteurs')}
            >
              Apporteurs
            </Button>
            <Button
              type="button"
              size="sm"
              variant={serviceCompetencies.conseil ? "default" : "outline"}
              onClick={() => toggleCompetency('conseil')}
            >
              Conseil
            </Button>
            <Button
              type="button"
              size="sm"
              variant={serviceCompetencies.autre ? "default" : "outline"}
              onClick={() => toggleCompetency('autre')}
            >
              Autre
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
