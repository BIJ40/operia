import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PipelineStage } from "@/apogee-connect/utils/pipelineCalculations";
import { TrendingUp, ArrowRight } from "lucide-react";

interface PipelineChartProps {
  stages: PipelineStage[];
  totalDossiers: number;
}

export const PipelineChart = ({ stages, totalDossiers }: PipelineChartProps) => {
  return (
    <Card className="p-8 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-2 border-green-200 dark:border-green-800 hover:scale-102 transition-all duration-300 cursor-pointer shadow-xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-green-900 dark:text-green-100">
            Pipeline RT → Travaux
          </h3>
          <p className="text-green-700 dark:text-green-300">Taux de conversion</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100">
          <TrendingUp className="w-4 h-4" />
          <span>{totalDossiers} dossiers</span>
        </div>
      </div>

      <div className="space-y-4 bg-white/80 dark:bg-black/30 rounded-xl p-6">
        {stages && stages.length > 0 ? (
          stages.map((stage, index) => {
            // Calculer la largeur pour l'effet entonnoir
            const width = stage.percentage;
            const isFirst = index === 0;
            const isLast = index === stages.length - 1;

            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-green-900 dark:text-green-100">
                    {stage.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-green-700 dark:text-green-300 font-bold">
                      {stage.count}
                    </span>
                    {stage.conversionRate !== undefined && (
                      <Badge variant="secondary" className="bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-100">
                        {stage.conversionRate.toFixed(0)}%
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Barre de l'entonnoir */}
                <div className="relative h-12 flex items-center">
                  <div
                    className={`h-full rounded-lg transition-all duration-500 flex items-center justify-between px-4 ${
                      isFirst
                        ? "bg-gradient-to-r from-blue-500 to-blue-600"
                        : index === 1
                        ? "bg-gradient-to-r from-green-500 to-green-600"
                        : index === 2
                        ? "bg-gradient-to-r from-purple-500 to-purple-600"
                        : "bg-gradient-to-r from-orange-500 to-orange-600"
                    }`}
                    style={{ width: `${Math.max(width, 10)}%` }}
                  >
                    <span className="text-white font-bold text-sm">
                      {stage.percentage.toFixed(0)}%
                    </span>
                    {!isLast && (
                      <ArrowRight className="w-4 h-4 text-white/80" />
                    )}
                  </div>
                </div>

                {/* Taux de conversion vers l'étape suivante */}
                {!isLast && stage.conversionRate !== undefined && (
                  <div className="flex justify-center">
                    <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                      <ArrowRight className="w-3 h-3" />
                      <span>
                        Taux de conversion: {stage.conversionRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="flex items-center justify-center h-64">
            <p className="text-green-600 dark:text-green-400 text-lg">
              Aucune donnée disponible
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 text-center">
        <p className="text-sm text-green-600 dark:text-green-400">
          Performance du tunnel de conversion
        </p>
      </div>
    </Card>
  );
};
