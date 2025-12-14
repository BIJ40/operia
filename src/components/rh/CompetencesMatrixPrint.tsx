/**
 * Composant d'impression de la matrice Techniciens x Compétences
 */

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Printer, X, Check } from 'lucide-react';
import { useRHCollaborators } from '@/hooks/useRHSuivi';
import { useCompetencesCatalogue } from '@/hooks/useRHCompetencesCatalogue';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompetencesMatrixPrint({ open, onOpenChange }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const { data: collaborators = [] } = useRHCollaborators();
  const { data: catalogue = [] } = useCompetencesCatalogue();

  // Filter only technicians
  const techniciens = collaborators.filter(c => 
    c.type === 'TECHNICIEN' && !c.leaving_date
  );

  // Get all unique competences
  const allCompetences = catalogue.map(c => c.label);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Matrice Techniciens x Compétences</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { 
            font-family: Arial, sans-serif; 
            padding: 20px;
            font-size: 11px;
          }
          h1 { 
            font-size: 16px; 
            margin-bottom: 5px;
            text-align: center;
          }
          .date {
            text-align: center;
            color: #666;
            margin-bottom: 20px;
            font-size: 10px;
          }
          table { 
            width: 100%; 
            border-collapse: collapse;
            table-layout: fixed;
          }
          th, td { 
            border: 1px solid #333;
            padding: 4px 6px;
            text-align: center;
          }
          th { 
            background: #f0f0f0;
            font-weight: bold;
          }
          th.name-col {
            text-align: left;
            width: 150px;
          }
          th.comp-col {
            writing-mode: vertical-rl;
            text-orientation: mixed;
            transform: rotate(180deg);
            height: 120px;
            font-size: 10px;
            padding: 8px 4px;
          }
          td.name-cell {
            text-align: left;
            font-weight: 500;
          }
          td.has-comp {
            background: #22c55e;
          }
          td.no-comp {
            background: #fff;
          }
          .legend {
            margin-top: 20px;
            display: flex;
            gap: 20px;
            justify-content: center;
            font-size: 10px;
          }
          .legend-item {
            display: flex;
            align-items: center;
            gap: 5px;
          }
          .legend-box {
            width: 16px;
            height: 16px;
            border: 1px solid #333;
          }
          .legend-box.green { background: #22c55e; }
          .legend-box.white { background: #fff; }
          @media print {
            body { padding: 10px; }
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
        <div class="legend">
          <div class="legend-item">
            <div class="legend-box green"></div>
            <span>Compétence acquise</span>
          </div>
          <div class="legend-item">
            <div class="legend-box white"></div>
            <span>Non acquise</span>
          </div>
        </div>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Matrice Techniciens x Compétences
          </DialogTitle>
        </DialogHeader>

        <div ref={printRef} className="overflow-x-auto">
          <h1>Matrice des Compétences Techniques</h1>
          <p className="date">
            Généré le {format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}
          </p>

          <table>
            <thead>
              <tr>
                <th className="name-col">Technicien</th>
                {allCompetences.map(comp => (
                  <th key={comp} className="comp-col">{comp}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {techniciens.map(tech => {
                const techComps = tech.competencies?.competences_techniques || [];
                return (
                  <tr key={tech.id}>
                    <td className="name-cell">
                      {tech.first_name} {tech.last_name}
                    </td>
                    {allCompetences.map(comp => {
                      const has = techComps.includes(comp);
                      return (
                        <td 
                          key={comp} 
                          className={has ? 'has-comp' : 'no-comp'}
                        >
                          {has && <Check className="h-4 w-4 text-white mx-auto" />}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap gap-4 justify-center pt-4 border-t">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 bg-green-500 rounded" />
            <span>Compétence acquise</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 bg-white border rounded" />
            <span>Non acquise</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Fermer
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
