/**
 * Page StatIA Builder
 * Interface de construction de statistiques personnalisées
 */

import React from 'react';
import { StatiaBuilder } from '../components/StatiaBuilder';

export default function StatiaBuilderPage() {
  return (
    <div className="h-[calc(100vh-4rem)]">
      <StatiaBuilder agencySlug="dax" />
    </div>
  );
}
