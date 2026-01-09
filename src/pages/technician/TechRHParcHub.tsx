/**
 * Hub RH & Parc - Navigation par tiles ludique
 */
import { Link } from 'react-router-dom';
import { FileText, Car, Wrench, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

const TILES = [
  {
    to: '/t/documents',
    icon: FileText,
    label: 'Mes documents',
    description: 'Coffre-fort RH',
    gradient: 'from-blue-500 to-blue-600',
  },
  {
    to: '/t/vehicule',
    icon: Car,
    label: 'Mon véhicule',
    description: 'Infos & échéances',
    gradient: 'from-emerald-500 to-emerald-600',
  },
  {
    to: '/t/materiel',
    icon: Wrench,
    label: 'Mon matériel',
    description: 'Équipements & outils',
    gradient: 'from-orange-500 to-orange-600',
  },
  {
    to: '/t/demandes',
    icon: Inbox,
    label: 'Mes demandes',
    description: 'Congés, EPI, docs',
    gradient: 'from-purple-500 to-purple-600',
  },
];

export default function TechRHParcHub() {
  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Mon espace</h1>
        <p className="text-sm text-muted-foreground">Documents, véhicule et demandes</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {TILES.map((tile) => (
          <Link
            key={tile.to}
            to={tile.to}
            className={cn(
              'relative overflow-hidden rounded-xl p-4 text-white transition-transform active:scale-95',
              `bg-gradient-to-br ${tile.gradient}`
            )}
          >
            <tile.icon className="h-8 w-8 mb-3 opacity-90" />
            <div className="font-semibold text-sm">{tile.label}</div>
            <div className="text-xs opacity-80">{tile.description}</div>
            {/* Decorative circle */}
            <div className="absolute -right-4 -bottom-4 h-20 w-20 rounded-full bg-white/10" />
          </Link>
        ))}
      </div>
    </div>
  );
}
