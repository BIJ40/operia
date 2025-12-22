import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, onKeyDown, ...props }, ref) => {
  // Handler pour empêcher les événements clavier de remonter et bloquer la saisie
  const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Empêcher la propagation pour toutes les touches de navigation et saisie
    // Cela permet les sauts de ligne (Enter), la navigation (flèches), et la saisie de chiffres
    e.stopPropagation();
    
    // Appeler le handler personnalisé si fourni
    onKeyDown?.(e);
  }, [onKeyDown]);

  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      onKeyDown={handleKeyDown}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
