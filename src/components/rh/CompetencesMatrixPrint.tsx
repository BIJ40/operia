/**
 * Matrice Techniciens × Compétences (Univers + Sous-compétences)
 * Colonnes groupées par univers parent
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
import { useUniversCatalog } from '@/hooks/useUniversCatalog';
import { useSubSkills, useAllCollaboratorSubSkills } from '@/hooks/useSubSkills';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompetencesMatrixPrint({ open, onOpenChange }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const { data: collaborators = [] } = useRHCollaborators();
  const { data: universCatalog = [] } = useUniversCatalog();
  const { data: allSubSkills = [] } = useSubSkills();

  // Filter only active collaborators (not just technicians)
  const activeCollabs = collaborators.filter(c => !c.leaving_date);

  const collabIds = activeCollabs.map(t => t.id);
  const { data: allCollabSubSkills = [] } = useAllCollaboratorSubSkills(collabIds);

  // Build grouped structure: univers → sub-skills
  const groupedColumns = universCatalog.map(univers => ({
    univers,
    subSkills: allSubSkills.filter(s => s.univers_id === univers.id).sort((a, b) =>
      a.label.localeCompare(b.label, 'fr')
    ),
  }));

  // Normalize for accent/case insensitive comparison
  const normalize = (s: string) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  // Helper: does this collab have this univers?
  const collabHasUnivers = (collabId: string, universLabel: string) => {
    const collab = activeCollabs.find(t => t.id === collabId);
    const normalizedTarget = normalize(universLabel);
    return collab?.competencies?.competences_techniques?.some(
      (ct: string) => normalize(ct) === normalizedTarget
    ) ?? false;
  };

  // Helper: does this collab have this sub-skill?
  const collabHasSubSkill = (collabId: string, subSkillId: string) =>
    allCollabSubSkills.some(cs => cs.collaborator_id === collabId && cs.sub_skill_id === subSkillId);

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
          body { font-family: Arial, sans-serif; padding: 15px; font-size: 10px; }
          h1 { font-size: 14px; margin-bottom: 4px; text-align: center; }
          .date { text-align: center; color: #666; margin-bottom: 15px; font-size: 9px; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          th, td { border: 1px solid #333; padding: 3px 4px; text-align: center; }
          th { background: #f0f0f0; font-weight: bold; }
          th.name-col { text-align: left; width: 130px; min-width: 130px; }
          th.univers-header { background: #d4e6f1; font-size: 9px; font-weight: 700; }
          th.sub-col {
            writing-mode: vertical-rl;
            text-orientation: mixed;
            transform: rotate(180deg);
            height: 100px;
            font-size: 8px;
            padding: 6px 3px;
            font-weight: normal;
          }
          td.name-cell { text-align: left; font-weight: 500; white-space: nowrap; }
          td.has { background: #22c55e; }
          td.no { background: #fff; }
          .legend { margin-top: 15px; display: flex; gap: 20px; justify-content: center; font-size: 9px; }
          .legend-item { display: flex; align-items: center; gap: 5px; }
          .legend-box { width: 14px; height: 14px; border: 1px solid #333; }
          .legend-box.green { background: #22c55e; }
          .legend-box.white { background: #fff; }
          @media print { @page { size: landscape; margin: 10mm; } }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
        <div class="legend">
          <div class="legend-item"><div class="legend-box green"></div><span>Compétence acquise</span></div>
          <div class="legend-item"><div class="legend-box white"></div><span>Non acquise</span></div>
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
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Matrice Techniciens × Compétences
          </DialogTitle>
        </DialogHeader>

        <div ref={printRef} className="overflow-x-auto">
          <h1>Matrice des Compétences Techniques</h1>
          <p className="date">
            Généré le {format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}
          </p>

          <table>
            <thead>
              {/* Row 1: Univers group headers */}
              <tr>
                <th className="name-col" rowSpan={2}>Technicien</th>
                {groupedColumns.map(({ univers, subSkills }) => (
                  <th
                    key={univers.id}
                    className="univers-header"
                    colSpan={Math.max(1, subSkills.length)}
                  >
                    {univers.label}
                  </th>
                ))}
              </tr>
              {/* Row 2: Sub-skill columns (or univers name if no sub-skills) */}
              <tr>
                {groupedColumns.map(({ univers, subSkills }) =>
                  subSkills.length === 0 ? (
                    <th key={univers.id} className="sub-col">
                      ✓
                    </th>
                  ) : (
                    subSkills.map(sub => (
                      <th key={sub.id} className="sub-col">
                        {sub.label}
                      </th>
                    ))
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {techniciens.map(tech => (
                <tr key={tech.id}>
                  <td className="name-cell">
                    {tech.first_name} {tech.last_name}
                  </td>
                  {groupedColumns.map(({ univers, subSkills }) =>
                    subSkills.length === 0 ? (
                      <td
                        key={univers.id}
                        className={techHasUnivers(tech.id, univers.label) ? 'has' : 'no'}
                      >
                        {techHasUnivers(tech.id, univers.label) && '✓'}
                      </td>
                    ) : (
                      subSkills.map(sub => (
                        <td
                          key={sub.id}
                          className={techHasSubSkill(tech.id, sub.id) ? 'has' : 'no'}
                        >
                          {techHasSubSkill(tech.id, sub.id) && '✓'}
                        </td>
                      ))
                    )
                  )}
                </tr>
              ))}
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
