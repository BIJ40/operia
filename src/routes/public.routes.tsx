/**
 * Routes publiques - Accessibles sans authentification
 * /guide-apogee : Guide Apogée public en lecture seule
 */

import { lazy } from 'react';
import { Route } from 'react-router-dom';
import { PublicEditorProvider } from '@/public-guide/contexts/PublicEditorContext';
import { PublicApogeeLayout } from '@/public-guide/components/PublicApogeeLayout';

// Lazy loaded pages
const PublicApogeeGuide = lazy(() => import('@/public-guide/pages/PublicApogeeGuide'));
const PublicApogeeCategory = lazy(() => import('@/public-guide/pages/PublicApogeeCategory'));

export function PublicRoutes() {
  return (
    <>
      <Route 
        path="/guide-apogee" 
        element={
          <PublicEditorProvider>
            <PublicApogeeLayout>
              <PublicApogeeGuide />
            </PublicApogeeLayout>
          </PublicEditorProvider>
        } 
      />
      <Route 
        path="/guide-apogee/category/:slug" 
        element={
          <PublicEditorProvider>
            <PublicApogeeLayout>
              <PublicApogeeCategory />
            </PublicApogeeLayout>
          </PublicEditorProvider>
        } 
      />
    </>
  );
}
