import React, { ReactNode } from 'react';
import bannerImage from '@/assets/helpconfort-banner.jpg';
import { Agency } from '@/contexts/AgencyContext';

interface SuiviShellProps {
  children: ReactNode;
  agency?: Agency;
}

export const SuiviShell: React.FC<SuiviShellProps> = ({ children, agency }) => {
  const displayLogo = agency?.logo_url || bannerImage;
  const altText = agency?.name || "Help Confort - Une marque de La Poste";

  return (
    <div className="min-h-screen bg-background font-body">
      <header className="w-full shadow-card">
        <img 
          src={displayLogo} 
          alt={altText}
          className="w-full h-auto object-contain max-h-32 md:max-h-40 lg:max-h-48"
        />
      </header>
      <main>{children}</main>
    </div>
  );
};
