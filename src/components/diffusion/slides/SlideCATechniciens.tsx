import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface SlideCATechniciensProps {
  currentMonthIndex: number;
}

export const SlideCATechniciens = ({ currentMonthIndex }: SlideCATechniciensProps) => {
  return (
    <Card className="shadow-2xl border-2 h-full">
      <CardHeader>
        <CardTitle className="text-2xl">CA par Technicien</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Graphique en cours d'implémentation...</p>
      </CardContent>
    </Card>
  );
};
