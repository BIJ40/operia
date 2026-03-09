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

  // Filter only active technicians & apprentices
  const activeCollabs = collaborators.filter(c =>
    !c.leaving_date && (c.type === 'TECHNICIEN' || c.role?.toLowerCase().includes('apprenti'))
  );

  const collabIds = activeCollabs.map(t => t.id);
  const { data: allCollabSubSkills = [] } = useAllCollaboratorSubSkills(collabIds);

  // Abbreviation map for univers headers
  const UNIVERS_ABBREV: Record<string, string> = {
    'rénovation': 'RÉNO',
    'renovation': 'RÉNO',
    'amélioration du logement': 'PMR',
    'amelioration du logement': 'PMR',
    'volet roulant': 'VR',
    'électricité': 'ÉLEC',
    'electricite': 'ÉLEC',
    'plomberie': 'PLOMB',
    'serrurerie': 'SERR',
    'vitrerie / miroiterie': 'VITR',
    'vitrerie': 'VITR',
    'menuiserie': 'MEN',
    'recherche de fuite': 'RDF',
    'multiservices': 'MULTI',
  };

  const getUniversAbbrev = (label: string) => {
    const key = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    return UNIVERS_ABBREV[key] || label.substring(0, 4).toUpperCase();
  };

  // Build grouped structure: univers → sub-skills
  const groupedColumns = universCatalog.map(univers => ({
    univers,
    subSkills: allSubSkills.filter(s => s.univers_id === univers.id).sort((a, b) =>
      a.label.localeCompare(b.label, 'fr')
    ),
  }));

  // Format tech name: Prénom + initiale Nom
  const formatTechName = (collab: { first_name?: string | null; last_name?: string | null }) => {
    const prenom = collab.first_name || '';
    const nom = collab.last_name || '';
    const initiale = nom.charAt(0).toUpperCase();
    return `${prenom} ${initiale}.`.trim();
  };

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
          body { font-family: Arial, sans-serif; padding: 10px; font-size: 9px; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          h1 { font-size: 14px; margin-bottom: 4px; text-align: center; }
          .date { text-align: center; color: #666; margin-bottom: 10px; font-size: 9px; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          th, td { border: 1px solid #aaa; padding: 2px; text-align: center; overflow: hidden; }
          th { background: #f0f0f0 !important; font-weight: bold; }
           th.name-col { text-align: left; width: 100px; min-width: 80px; }
           th.univers-header { background: #d4e6f1 !important; font-size: 7px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
           th.sub-col {
            writing-mode: vertical-rl;
            text-orientation: mixed;
            transform: rotate(180deg);
            height: 90px;
            font-size: 7px;
            padding: 4px 2px;
            font-weight: normal;
            overflow: hidden;
          }
          td.name-cell { text-align: left; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 8px; }
          td[data-has="true"] { background: #22c55e !important; }
          td[data-has="false"] { background: #fff !important; }
          .legend { margin-top: 10px; display: flex; gap: 20px; justify-content: center; font-size: 9px; }
          .legend-item { display: flex; align-items: center; gap: 5px; }
          .legend-box { width: 14px; height: 14px; border: 1px solid #333; }
          .legend-box.green { background: #22c55e !important; }
          .legend-box.white { background: #fff !important; }
          .print-btn { margin: 15px auto; display: block; padding: 8px 24px; font-size: 13px; cursor: pointer; background: #2563eb; color: #fff; border: none; border-radius: 6px; }
          .print-btn:hover { background: #1d4ed8; }
          @media print {
            @page { size: landscape; margin: 8mm; }
            .print-btn { display: none !important; }
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
        <div class="legend">
          <div class="legend-item"><div class="legend-box green"></div><span>Compétence acquise</span></div>
          <div class="legend-item"><div class="legend-box white"></div><span>Non acquise</span></div>
        </div>
        <button class="print-btn" onclick="window.print()">🖨️ Imprimer</button>
      </body>
      </html>
    `);

    printWindow.document.close();
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
                     {getUniversAbbrev(univers.label)}
                   </th>
                ))}
              </tr>
              {/* Row 2: Sub-skill columns (or univers name if no sub-skills) */}
              <tr>
                {groupedColumns.map(({ univers, subSkills }) =>
                  subSkills.length === 0 ? (
                    <th key={univers.id} className="sub-col">—</th>
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
              {activeCollabs.map(collab => (
                <tr key={collab.id}>
                  <td className="name-cell">
                    {collab.first_name} {collab.last_name}
                  </td>
                  {groupedColumns.map(({ univers, subSkills }) =>
                    subSkills.length === 0 ? (
                      <td
                        key={univers.id}
                        data-has={collabHasUnivers(collab.id, univers.label) ? 'true' : 'false'}
                        style={collabHasUnivers(collab.id, univers.label) ? { backgroundColor: '#22c55e' } : undefined}
                      />
                    ) : (
                      subSkills.map(sub => (
                        <td
                          key={sub.id}
                          data-has={collabHasSubSkill(collab.id, sub.id) ? 'true' : 'false'}
                          style={collabHasSubSkill(collab.id, sub.id) ? { backgroundColor: '#22c55e' } : undefined}
                        />
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
