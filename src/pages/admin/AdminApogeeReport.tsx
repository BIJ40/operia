import { useState } from 'react';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Accordion, AccordionContent, AccordionItem, AccordionTrigger 
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Copy, Download, FileJson, Server, Code2, FolderTree, 
  CheckCircle2, RefreshCw, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

// Import the generated report
import reportData from '@/data/apogee-usage-report.json';

interface PropertyChain {
  chain: string;
  count: number;
  files?: string[];
}

interface ApogeeReport {
  generatedAt: string;
  summary: {
    totalFiles: number;
    uniqueEndpoints: number;
    uniquePropertyChains: number;
  };
  endpoints: string[];
  propertyChains: PropertyChain[];
  groupedByEntity: {
    projects: PropertyChain[];
    devis: PropertyChain[];
    factures: PropertyChain[];
    interventions: PropertyChain[];
    clients: PropertyChain[];
    users: PropertyChain[];
    other: PropertyChain[];
  };
}

const report = reportData as ApogeeReport;

const ENTITY_LABELS: Record<string, { label: string; color: string }> = {
  projects: { label: 'Projects / Dossiers', color: 'bg-blue-500' },
  devis: { label: 'Devis / Quotes', color: 'bg-green-500' },
  factures: { label: 'Factures / Invoices', color: 'bg-yellow-500' },
  interventions: { label: 'Interventions / Planning', color: 'bg-purple-500' },
  clients: { label: 'Clients', color: 'bg-orange-500' },
  users: { label: 'Users / Techniciens', color: 'bg-pink-500' },
  other: { label: 'Autres', color: 'bg-gray-500' },
};

export default function AdminApogeeReport() {
  const [copiedJson, setCopiedJson] = useState(false);

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      setCopiedJson(true);
      toast.success('JSON copié dans le presse-papiers');
      setTimeout(() => setCopiedJson(false), 2000);
    } catch {
      toast.error('Erreur lors de la copie');
    }
  };

  const handleDownloadReport = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apogee-usage-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Rapport téléchargé');
  };

  const isEmpty = report.endpoints.length === 0 && report.propertyChains.length === 0;

  return (
    <div className="container max-w-app mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileJson className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Rapport Apogée API</h1>
            <p className="text-sm text-muted-foreground">
              Analyse des appels et champs utilisés dans le code
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyJson}>
            {copiedJson ? (
              <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
            ) : (
              <Copy className="w-4 h-4 mr-2" />
            )}
            Copier JSON
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadReport}>
            <Download className="w-4 h-4 mr-2" />
            Télécharger
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Généré le
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {new Date(report.generatedAt).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FolderTree className="w-4 h-4" />
              Fichiers analysés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{report.summary.totalFiles}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Server className="w-4 h-4" />
              Endpoints uniques
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{report.summary.uniqueEndpoints}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Code2 className="w-4 h-4" />
              Property Chains
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{report.summary.uniquePropertyChains}</p>
          </CardContent>
        </Card>
      </div>

      {isEmpty ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Rapport non généré</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
              Exécutez la commande <code className="bg-muted px-2 py-1 rounded">npm run apogee:report</code> pour générer le rapport d'analyse.
            </p>
            <Button variant="outline" disabled>
              <RefreshCw className="w-4 h-4 mr-2" />
              Génération manuelle requise
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="endpoints" className="space-y-4">
          <TabsList>
            <TabsTrigger value="endpoints">
              Endpoints ({report.endpoints.length})
            </TabsTrigger>
            <TabsTrigger value="chains">
              Property Chains ({report.propertyChains.length})
            </TabsTrigger>
            <TabsTrigger value="grouped">
              Par Entité
            </TabsTrigger>
          </TabsList>

          {/* Endpoints Tab */}
          <TabsContent value="endpoints">
            <Card>
              <CardHeader>
                <CardTitle>Endpoints Apogée Détectés</CardTitle>
                <CardDescription>
                  Liste des identifiants d'endpoints correspondant au pattern apiGet*
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Endpoint</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.endpoints.map((endpoint, index) => (
                        <TableRow key={endpoint}>
                          <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                          <TableCell>
                            <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                              {endpoint}
                            </code>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Property Chains Tab */}
          <TabsContent value="chains">
            <Card>
              <CardHeader>
                <CardTitle>Property Chains</CardTitle>
                <CardDescription>
                  Chaînes d'accès aux propriétés triées par fréquence d'utilisation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Count</TableHead>
                        <TableHead>Chaîne</TableHead>
                        <TableHead>Fichiers (top 5)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.propertyChains.map((item) => (
                        <TableRow key={item.chain}>
                          <TableCell>
                            <Badge variant="secondary">{item.count}</Badge>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs font-mono bg-muted px-2 py-1 rounded break-all">
                              {item.chain}
                            </code>
                          </TableCell>
                          <TableCell className="max-w-[300px]">
                            <div className="flex flex-wrap gap-1">
                              {item.files?.map((file) => (
                                <Badge 
                                  key={file} 
                                  variant="outline" 
                                  className="text-xs truncate max-w-[150px]"
                                  title={file}
                                >
                                  {file.split('/').pop()}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Grouped by Entity Tab */}
          <TabsContent value="grouped">
            <Card>
              <CardHeader>
                <CardTitle>Regroupement par Entité</CardTitle>
                <CardDescription>
                  Property chains organisées par type d'entité Apogée
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="w-full">
                  {Object.entries(report.groupedByEntity).map(([entityKey, chains]) => {
                    const entity = ENTITY_LABELS[entityKey] || { label: entityKey, color: 'bg-gray-500' };
                    return (
                      <AccordionItem key={entityKey} value={entityKey}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${entity.color}`} />
                            <span className="font-medium">{entity.label}</span>
                            <Badge variant="secondary" className="ml-2">
                              {chains.length} chains
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          {chains.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-4 text-center">
                              Aucune property chain détectée pour cette entité
                            </p>
                          ) : (
                            <ScrollArea className="h-[300px]">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-20">Count</TableHead>
                                    <TableHead>Chaîne</TableHead>
                                    <TableHead>Fichiers</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {chains.map((item) => (
                                    <TableRow key={item.chain}>
                                      <TableCell>
                                        <Badge variant="secondary">{item.count}</Badge>
                                      </TableCell>
                                      <TableCell>
                                        <code className="text-xs font-mono bg-muted px-2 py-1 rounded break-all">
                                          {item.chain}
                                        </code>
                                      </TableCell>
                                      <TableCell className="max-w-[250px]">
                                        <div className="flex flex-wrap gap-1">
                                          {item.files?.slice(0, 3).map((file) => (
                                            <Badge 
                                              key={file} 
                                              variant="outline" 
                                              className="text-xs truncate max-w-[120px]"
                                              title={file}
                                            >
                                              {file.split('/').pop()}
                                            </Badge>
                                          ))}
                                          {(item.files?.length || 0) > 3 && (
                                            <Badge variant="outline" className="text-xs">
                                              +{(item.files?.length || 0) - 3}
                                            </Badge>
                                          )}
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </ScrollArea>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
