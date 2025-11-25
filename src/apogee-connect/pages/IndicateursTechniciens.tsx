export default function IndicateursTechniciens() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
        Les techniciens
      </h1>
      
      <div className="flex items-center justify-center min-h-[400px] border-2 border-dashed border-muted rounded-2xl">
        <div className="text-center space-y-4">
          <p className="text-2xl font-semibold text-muted-foreground">Section à venir</p>
          <p className="text-sm text-muted-foreground max-w-md">
            Cette section affichera les statistiques et analyses par technicien
          </p>
        </div>
      </div>
    </div>
  );
}
