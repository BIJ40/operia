import { ReactNode } from 'react';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return <div className="container mx-auto p-6">{children}</div>;
}
