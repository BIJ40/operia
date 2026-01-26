/**
 * Routes publiques - Accessibles sans authentification
 * /guide-apogee : Guide Apogée public en lecture seule avec interface multi-onglets
 */

import { lazy } from 'react';
import { Route } from 'react-router-dom';
import { PublicEditorProvider } from '@/public-guide/contexts/PublicEditorContext';
import { PublicApogeeLayout } from '@/public-guide/components/PublicApogeeLayout';

export function PublicRoutes() {
  return (
    <Route 
      path="/guide-apogee" 
      element={
        <PublicEditorProvider>
          <PublicApogeeLayout />
        </PublicEditorProvider>
      } 
    />
  );
}
