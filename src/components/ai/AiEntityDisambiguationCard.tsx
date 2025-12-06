/**
 * Carte de désambiguïsation d'entités (techniciens / apporteurs)
 */

import React from 'react';
import { motion } from 'framer-motion';
import { User, Building2, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TechnicienCandidate, ApporteurCandidate } from '@/services/aiSearch/entityResolver';

interface AiEntityDisambiguationCardProps {
  type: 'technicien' | 'apporteur';
  candidates: TechnicienCandidate[] | ApporteurCandidate[];
  originalQuery: string;
  onSelect: (id: number, name: string) => void;
  onCancel: () => void;
}

export function AiEntityDisambiguationCard({
  type,
  candidates,
  originalQuery,
  onSelect,
  onCancel,
}: AiEntityDisambiguationCardProps) {
  const isTechnicien = type === 'technicien';
  const Icon = isTechnicien ? User : Building2;
  const title = isTechnicien 
    ? 'Quel technicien vouliez-vous dire ?' 
    : 'Quel apporteur vouliez-vous dire ?';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <Card className="border-helpconfort-blue/30 bg-gradient-to-br from-helpconfort-blue/5 via-background to-background">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <HelpCircle className="h-5 w-5 text-helpconfort-blue" />
            {title}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Plusieurs correspondances trouvées pour votre requête
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {candidates.map((candidate, index) => {
            const name = isTechnicien 
              ? (candidate as TechnicienCandidate).fullName 
              : (candidate as ApporteurCandidate).displayName;
            const matchType = candidate.matchType;
            const score = Math.round(candidate.matchScore * 100);
            
            return (
              <motion.div
                key={candidate.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-auto py-3 hover:bg-helpconfort-blue/10 hover:border-helpconfort-blue/50"
                  onClick={() => onSelect(candidate.id, name)}
                >
                  <Icon className="h-4 w-4 text-helpconfort-blue shrink-0" />
                  <div className="flex-1 text-left">
                    <span className="font-medium">{name}</span>
                    {isTechnicien && (candidate as TechnicienCandidate).name && (
                      <span className="text-muted-foreground ml-1">
                        ({(candidate as TechnicienCandidate).firstname} {(candidate as TechnicienCandidate).name})
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {matchType === 'exact' ? '✓ exact' : 
                     matchType === 'firstname' ? 'prénom' :
                     matchType === 'lastname' ? 'nom' :
                     matchType === 'partial' ? 'partiel' :
                     `~${score}%`}
                  </span>
                </Button>
              </motion.div>
            );
          })}
          
          <div className="pt-2 flex justify-end">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Annuler
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
