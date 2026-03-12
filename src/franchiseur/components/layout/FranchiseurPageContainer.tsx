/**
 * Container unifié pour toutes les pages Franchiseur
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FranchiseurPageContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: 'default' | 'full' | 'narrow';
}

export function FranchiseurPageContainer({
  children,
  className,
  maxWidth = 'default',
}: FranchiseurPageContainerProps) {
  return (
    <div 
      className={cn(
        "py-6 px-4 sm:px-6 lg:px-8 space-y-6",
        maxWidth === 'default' && "max-w-[1536px] mx-auto",
        maxWidth === 'narrow' && "max-w-5xl mx-auto",
        maxWidth === 'full' && "w-full",
        className
      )}
    >
      {children}
    </div>
  );
}
