import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Filter, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface FilterOption {
  value: string;
  label: string;
}

interface ColumnFilterProps {
  title: string;
  options: FilterOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function ColumnFilter({ title, options, selected, onChange }: ColumnFilterProps) {
  const [open, setOpen] = useState(false);

  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(s => s !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const handleSelectAll = () => {
    onChange(options.map(o => o.value));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const hasFilters = selected.length > 0;

  return (
    <div className="flex items-center gap-1">
      <span>{title}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`h-6 w-6 p-0 ${hasFilters ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <Filter className="h-3.5 w-3.5" />
            {hasFilters && (
              <Badge 
                variant="default" 
                className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
              >
                {selected.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-2 border-b">
              <span className="text-sm font-medium">Filtrer par {title.toLowerCase()}</span>
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={handleClearAll}
                >
                  <X className="h-3 w-3 mr-1" />
                  Effacer
                </Button>
              )}
            </div>
            <div className="flex gap-2 pb-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs flex-1"
                onClick={handleSelectAll}
              >
                Tout
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs flex-1"
                onClick={handleClearAll}
              >
                Aucun
              </Button>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {options.map((option) => (
                <div
                  key={option.value}
                  className="flex items-center space-x-2 p-1.5 rounded hover:bg-muted cursor-pointer"
                  onClick={() => handleToggle(option.value)}
                >
                  <Checkbox
                    checked={selected.includes(option.value)}
                    onCheckedChange={() => handleToggle(option.value)}
                  />
                  <span className="text-sm">{option.label}</span>
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
