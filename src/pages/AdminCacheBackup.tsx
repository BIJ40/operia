import { CacheBackupManager } from '@/components/admin/CacheBackupManager';

export default function AdminCacheBackup() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-helpconfort-blue-dark to-helpconfort-blue-lighter bg-clip-text text-transparent">
            Gestion des Backups Cache
          </h1>
          <p className="text-muted-foreground mt-2">
            Système de sauvegarde et restauration automatique du cache localStorage
          </p>
        </div>

        <CacheBackupManager />
      </div>
    </div>
  );
}
