import { ShieldCheck } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="text-center text-primary-foreground max-w-md">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
            <ShieldCheck className="w-12 h-12 text-white" />
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-4">
          Espace de suivi client
        </h1>

        <p className="text-white/90 text-lg mb-6">
          Cette page n'est pas accessible directement.
        </p>

        <p className="text-white/70 text-sm">
          Veuillez utiliser le lien personnalisé qui vous a été envoyé par SMS ou e-mail.
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

export default Index;
