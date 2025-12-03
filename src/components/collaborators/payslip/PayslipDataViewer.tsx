/**
 * Visualisation des données extraites des bulletins de paie
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, AlertTriangle, TrendingUp, Settings2, Eye, EyeOff } from 'lucide-react';
import { PayslipData, LigneRemunerationVariable } from '@/types/payslipData';
import { PayslipChartBuilder } from './PayslipChartBuilder';
import { PAYSLIP_METRICS, DETAILED_METRICS, PayslipMetric } from './PayslipMetricSelector';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface PayslipDataViewerProps {
  payslips: PayslipData[];
  isLoading?: boolean;
}

const DEFAULT_VISIBLE_COLUMNS = [
  'taux_horaire_brut',
  'total_brut',
  'net_a_payer',
  'total_charges_salariales',
];

export function PayslipDataViewer({ payslips, isLoading }: PayslipDataViewerProps) {
  const [selectedPayslipId, setSelectedPayslipId] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_VISIBLE_COLUMNS);
  const [activeTab, setActiveTab] = useState('tableau');

  const allMetrics = [...PAYSLIP_METRICS, ...DETAILED_METRICS];

  const selectedPayslip = payslips.find(p => p.id === selectedPayslipId);

  const formatValue = (value: any, format: string) => {
    if (value == null) return '-';
    switch (format) {
      case 'currency':
        return `${Number(value).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €`;
      case 'hours':
        return `${value} h`;
      case 'percent':
        return `${value} %`;
      default:
        return String(value);
    }
  };

  const getMetricValue = (payslip: PayslipData, metricId: string): any => {
    // Valeurs directes
    if (metricId in payslip) {
      return (payslip as any)[metricId];
    }

    // Valeurs calculées depuis raw_data
    if (!payslip.raw_data?.lignes_remuneration_variables) return null;

    const lignes = payslip.raw_data.lignes_remuneration_variables;

    if (metricId === 'primes_total') {
      return lignes
        .filter((l: LigneRemunerationVariable) => l.categorie_interne.includes('prime'))
        .reduce((sum: number, l: LigneRemunerationVariable) => sum + (l.montant || 0), 0);
    }

    if (metricId === 'heures_supp_total') {
      return lignes
        .filter((l: LigneRemunerationVariable) => l.categorie_interne.includes('heures_supp'))
        .reduce((sum: number, l: LigneRemunerationVariable) => sum + (l.nombre || 0), 0);
    }

    if (metricId === 'montant_heures_supp') {
      return lignes
        .filter((l: LigneRemunerationVariable) => l.categorie_interne.includes('heures_supp'))
        .reduce((sum: number, l: LigneRemunerationVariable) => sum + (l.montant || 0), 0);
    }

    // Chercher par categorie_interne
    const ligne = lignes.find((l: LigneRemunerationVariable) => l.categorie_interne === metricId);
    if (ligne) {
      return ligne.montant || ligne.nombre;
    }

    return null;
  };

  const toggleColumn = (columnId: string) => {
    setVisibleColumns(prev =>
      prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Chargement des données...
        </CardContent>
      </Card>
    );
  }

  if (payslips.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Aucun bulletin de paie analysé.</p>
          <p className="text-sm mt-2">
            Uploadez des bulletins de paie PDF et utilisez le bouton d'analyse IA.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-helpconfort-blue" />
              Données extraites ({payslips.length} bulletin{payslips.length > 1 ? 's' : ''})
            </CardTitle>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings2 className="h-4 w-4 mr-2" />
                  Colonnes
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Colonnes à afficher</SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-120px)] mt-4">
                  <div className="space-y-4">
                    {['Base', 'Totaux', 'Charges', 'Cumuls', 'Primes', 'Heures sup'].map(category => {
                      const categoryMetrics = allMetrics.filter(m => m.category === category);
                      if (categoryMetrics.length === 0) return null;

                      return (
                        <div key={category}>
                          <h4 className="font-medium mb-2">{category}</h4>
                          <div className="space-y-2 pl-2">
                            {categoryMetrics.map(metric => (
                              <div key={metric.id} className="flex items-center gap-2">
                                <Checkbox
                                  id={`col-${metric.id}`}
                                  checked={visibleColumns.includes(metric.id)}
                                  onCheckedChange={() => toggleColumn(metric.id)}
                                />
                                <Label htmlFor={`col-${metric.id}`} className="text-sm cursor-pointer">
                                  {metric.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="tableau">Tableau</TabsTrigger>
              <TabsTrigger value="graphiques">
                <TrendingUp className="h-4 w-4 mr-1" />
                Graphiques
              </TabsTrigger>
              <TabsTrigger value="detail">Détail bulletin</TabsTrigger>
            </TabsList>

            <TabsContent value="tableau">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background z-10 min-w-[100px]">
                        Période
                      </TableHead>
                      {visibleColumns.map(colId => {
                        const metric = allMetrics.find(m => m.id === colId);
                        return (
                          <TableHead key={colId} className="text-right whitespace-nowrap">
                            {metric?.label || colId}
                          </TableHead>
                        );
                      })}
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payslips.map(payslip => (
                      <TableRow
                        key={payslip.id}
                        className={selectedPayslipId === payslip.id ? 'bg-muted/50' : ''}
                      >
                        <TableCell className="sticky left-0 bg-background font-medium">
                          {String(payslip.periode_mois).padStart(2, '0')}/{payslip.periode_annee}
                          {payslip.extraction_warnings && payslip.extraction_warnings.length > 0 && (
                            <AlertTriangle className="h-3 w-3 text-amber-500 inline ml-1" />
                          )}
                        </TableCell>
                        {visibleColumns.map(colId => {
                          const metric = allMetrics.find(m => m.id === colId);
                          const value = getMetricValue(payslip, colId);
                          return (
                            <TableCell key={colId} className="text-right tabular-nums">
                              {formatValue(value, metric?.format || 'number')}
                            </TableCell>
                          );
                        })}
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedPayslipId(payslip.id);
                              setActiveTab('detail');
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="graphiques">
              <PayslipChartBuilder payslips={payslips} />
            </TabsContent>

            <TabsContent value="detail">
              <div className="space-y-4">
                <Select
                  value={selectedPayslipId || ''}
                  onValueChange={setSelectedPayslipId}
                >
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Sélectionner un bulletin..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {payslips.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {String(p.periode_mois).padStart(2, '0')}/{p.periode_annee}
                        {p.extraction_warnings && p.extraction_warnings.length > 0 && (
                          <AlertTriangle className="h-3 w-3 text-amber-500 inline ml-2" />
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedPayslip && (
                  <PayslipDetailView payslip={selectedPayslip} />
                )}

                {!selectedPayslip && (
                  <div className="text-center py-8 text-muted-foreground">
                    Sélectionnez un bulletin pour voir le détail
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// Composant de détail d'un bulletin
function PayslipDetailView({ payslip }: { payslip: PayslipData }) {
  const raw = payslip.raw_data;

  if (!raw) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Données brutes non disponibles
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-4">
        {/* Avertissements */}
        {payslip.extraction_warnings && payslip.extraction_warnings.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium mb-2">
              <AlertTriangle className="h-4 w-4" />
              Avertissements ({payslip.extraction_warnings.length})
            </div>
            <ul className="text-sm text-amber-600 dark:text-amber-300 list-disc pl-5 space-y-1">
              {payslip.extraction_warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Infos générales */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Employeur</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p className="font-medium">{raw.employeur?.raison_sociale || '-'}</p>
              <p className="text-muted-foreground">{raw.employeur?.adresse}</p>
              <p className="text-xs text-muted-foreground">
                SIRET: {raw.employeur?.siret || '-'} | APE: {raw.employeur?.ape_naf || '-'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Salarié</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p className="font-medium">{raw.salarie?.nom_complet || '-'}</p>
              <p className="text-muted-foreground">
                {raw.classification?.emploi_intitule} - {raw.classification?.statut}
              </p>
              <p className="text-xs text-muted-foreground">
                Matricule: {raw.salarie?.matricule || '-'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Lignes de rémunération */}
        {raw.lignes_remuneration_variables && raw.lignes_remuneration_variables.length > 0 && (
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Lignes de rémunération variable</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Libellé</TableHead>
                    <TableHead className="text-center">Qté</TableHead>
                    <TableHead className="text-right">Taux</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {raw.lignes_remuneration_variables.map((ligne: LigneRemunerationVariable, i: number) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{ligne.libelle}</p>
                          <Badge variant="outline" className="text-xs">
                            {ligne.categorie_interne}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {ligne.nombre != null ? `${ligne.nombre} ${ligne.unite || ''}` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {ligne.taux != null ? `${ligne.taux} €` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {ligne.montant != null ? `${ligne.montant.toLocaleString('fr-FR')} €` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Totaux */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Totaux</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Brut total</span>
                <span className="font-medium">{payslip.total_brut?.toLocaleString('fr-FR')} €</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Net imposable</span>
                <span className="font-medium">{payslip.net_imposable?.toLocaleString('fr-FR')} €</span>
              </div>
              <div className="flex justify-between text-primary font-medium">
                <span>Net à payer</span>
                <span>{payslip.net_a_payer?.toLocaleString('fr-FR')} €</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Charges</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Salariales</span>
                <span className="font-medium">{payslip.total_charges_salariales?.toLocaleString('fr-FR')} €</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Patronales</span>
                <span className="font-medium">{payslip.total_charges_patronales?.toLocaleString('fr-FR')} €</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Coût total</span>
                <span className="font-medium">{payslip.cout_global_employeur?.toLocaleString('fr-FR')} €</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Cumuls annuels</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Brut cumulé</span>
                <span className="font-medium">{payslip.brut_cumule?.toLocaleString('fr-FR')} €</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Net imp. cumulé</span>
                <span className="font-medium">{payslip.net_imposable_cumule?.toLocaleString('fr-FR')} €</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Heures cumulées</span>
                <span className="font-medium">{payslip.heures_cumulees} h</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ScrollArea>
  );
}
