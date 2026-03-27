import { Settings } from "lucide-react";

const MaintenancePage = () => {
  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="text-center text-primary-foreground max-w-md">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
            <Settings className="w-12 h-12 text-white animate-spin" style={{ animationDuration: '3s' }} />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold mb-4">
          Maintenance en cours
        </h1>
        
        <p className="text-white/90 text-lg mb-6">
          Nous effectuons actuellement des travaux d'amélioration de notre service de suivi.
        </p>
        
        <p className="text-white/70 text-sm">
          Veuillez réessayer dans quelques instants.<br />
          Merci de votre compréhension.
        </p>
        
        <div className="mt-8 pt-6 border-t border-white/20">
          <p className="text-white/60 text-xs">
            HelpConfort - Service de suivi client
          </p>
        </div>
      </div>
    </div>
  );
};

export default MaintenancePage;
