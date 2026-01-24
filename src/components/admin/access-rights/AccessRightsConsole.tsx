/**
 * Console Droits & Accès - Page principale simplifiée
 * Redirige vers UnifiedManagementPage - conservé pour compatibilité
 */

import { Navigate } from 'react-router-dom';

export default function AccessRightsConsole() {
  return <Navigate to="/admin/gestion" replace />;
}
