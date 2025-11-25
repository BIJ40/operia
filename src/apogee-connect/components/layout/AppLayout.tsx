import { ReactNode } from 'react';
import { TooltipProvider } from "@/components/ui/tooltip";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <TooltipProvider delayDuration={0}>
      <div className="container mx-auto p-6">{children}</div>
    </TooltipProvider>
  );
}

