import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AdminPanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: 'none' | 'sm' | 'md';
}

const paddingClasses: Record<NonNullable<AdminPanelProps['padding']>, string> = {
  none: '',
  sm: 'p-3 sm:p-4',
  md: 'p-4 sm:p-5',
};

export function AdminPanel({ children, className, padding = 'md', ...props }: AdminPanelProps) {
  return (
    <div
      className={cn('rounded-lg border border-border bg-background', paddingClasses[padding], className)}
      {...props}
    >
      {children}
    </div>
  );
}