import React from 'react';

interface ModulePreconditionEmptyProps {
  moduleKey: string;
  message?: string;
}

const PRECONDITION_MESSAGES: Record<string, string> = {
  'commercial.veille':
    "Ce module nécessite l'activation du Pack Suivi Client pour votre agence.",
  'relations.apporteurs':
    "Ce module nécessite l'activation du Portail Apporteur pour votre agence.",
};

const DEFAULT_MESSAGE =
  'Ce module nécessite une configuration supplémentaire. Contactez votre administrateur.';

export function ModulePreconditionEmpty({
  moduleKey,
  message,
}: ModulePreconditionEmptyProps) {
  const displayMessage =
    message ?? PRECONDITION_MESSAGES[moduleKey] ?? DEFAULT_MESSAGE;

  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] p-8 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-6">
        <svg
          className="w-8 h-8 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
      </div>

      <p className="text-muted-foreground max-w-md mb-4">{displayMessage}</p>

      <a
        href="mailto:support@operia.fr"
        className="text-sm font-medium text-primary hover:text-primary/80"
      >
        Contacter votre administrateur
      </a>
    </div>
  );
}
